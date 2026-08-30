import { NextRequest, NextResponse } from "next/server";
import { chatWithTutor, chatWithTutorStream, mapearErroGemini } from "@/lib/gemini";
import { claudeConfigurado, tutorClaude } from "@/lib/claude-cli";
import {
  getChatHistory,
  appendChatExchange,
  clearChatThread,
} from "@/lib/chat-history";

export const dynamic = "force-dynamic";

/**
 * O servidor é a única fonte de verdade do histórico (o cliente não envia mais
 * a própria cópia), e só as últimas mensagens vão pro Gemini — thread longa
 * não pode devorar a cota diária compartilhada com a agenda.
 */
const MAX_HISTORICO_PARA_IA = 12;

export async function GET(req: NextRequest) {
  const threadKey = req.nextUrl.searchParams.get("threadKey");
  if (!threadKey) {
    return NextResponse.json({ error: "threadKey obrigatório." }, { status: 400 });
  }
  const history = await getChatHistory(threadKey);
  return NextResponse.json({ history });
}

export async function DELETE(req: NextRequest) {
  const threadKey = req.nextUrl.searchParams.get("threadKey");
  if (!threadKey) {
    return NextResponse.json({ error: "threadKey obrigatório." }, { status: 400 });
  }
  await clearChatThread(threadKey);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = body?.message;
  const courseContext =
    typeof body?.courseContext === "string" ? body.courseContext : undefined;
  const threadKey = typeof body?.threadKey === "string" ? body.threadKey : "geral";

  if (!message || typeof message !== "string" || message.length > 2000) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }

  const historico = (await getChatHistory(threadKey)).slice(-MAX_HISTORICO_PARA_IA);

  // Motor preferido do Assistente: a assinatura do Claude (decisão do dono).
  // Qualquer falha — limite da assinatura, CLI fora — cai pro Gemini abaixo.
  if (claudeConfigurado()) {
    try {
      const reply = await tutorClaude(historico, message, courseContext);
      await appendChatExchange(threadKey, message, reply);
      return NextResponse.json({ reply, motor: "claude" });
    } catch (err) {
      console.warn("[tutor] Claude (assinatura) falhou, caindo pro Gemini:", err);
    }
  }

  try {
    const gerador = chatWithTutorStream(historico, message, courseContext);
    // O erro de cota/indisponibilidade estoura no primeiro pedaço — puxamos
    // ele AQUI, antes de comprometer a resposta como stream.
    const primeiro = await gerador.next();

    const encoder = new TextEncoder();
    let completa = primeiro.done ? "" : primeiro.value;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (!primeiro.done) controller.enqueue(encoder.encode(primeiro.value));
          for await (const pedaco of gerador) {
            completa += pedaco;
            controller.enqueue(encoder.encode(pedaco));
          }
        } catch (err) {
          // Caiu no meio: o que já saiu fica valendo; só registramos.
          console.error("[tutor] stream interrompido:", err);
        } finally {
          if (completa.trim()) {
            await appendChatExchange(threadKey, message, completa);
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // Algumas redes derrubam a conexão de streaming (SSE) sem nem responder.
    // Nesses casos a rota degrada pro modo tradicional em vez de falhar.
    const texto = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    if (/fetch failed|abort|timeout/i.test(texto)) {
      console.warn("[tutor] stream indisponível, caindo pro modo tradicional");
      try {
        const reply = await chatWithTutor(historico, message, courseContext);
        await appendChatExchange(threadKey, message, reply);
        return NextResponse.json({ reply });
      } catch (err2) {
        const { status, mensagem } = mapearErroGemini(err2);
        return NextResponse.json({ error: mensagem }, { status });
      }
    }

    console.error("[tutor] falha antes do stream:", err);
    const { status, mensagem } = mapearErroGemini(err);
    return NextResponse.json({ error: mensagem }, { status });
  }
}
