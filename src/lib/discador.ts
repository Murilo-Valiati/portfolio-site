import path from "path";
import { readJson, withLock, writeJsonAtomic } from "@/lib/json-store";
import { getNotes } from "@/lib/notes";

/**
 * Avisa você 15 minutos antes de eventos marcados com "me ligue".
 *
 * Dois canais, por ordem de preferência:
 *
 * 1. PUSHOVER (canal escolhido) — notificação de EMERGÊNCIA: toca alto,
 *    repete a cada 30 s até ser confirmada e fura o modo silencioso do
 *    iPhone. Envs: PUSHOVER_TOKEN (token do app) e PUSHOVER_USER (user key).
 *
 * 2. TWILIO (ligação de voz, alternativa futura) — envs: TWILIO_ACCOUNT_SID,
 *    TWILIO_AUTH_TOKEN, TWILIO_FROM, DISCADOR_PARA.
 *
 * Sem nenhuma env o módulo fica dormante; o sufixo " - Me Ligue" nos títulos
 * mantém o fluxo antigo do Toki funcionando durante a transição.
 *
 * V1 sem retentativa própria: um aviso por evento, registrado em
 * ligacoes.json para nunca avisar duas vezes (a insistência de verdade é do
 * próprio Pushover, que repete até você confirmar).
 */

const ANTECEDENCIA_MIN = 15;

interface Aviso {
  eventoId: string;
  notaId: string;
  titulo: string;
  inicioEvento: string;
  chamadaEm: string;
  canal: "pushover" | "twilio";
  providerId?: string;
  erro?: string;
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const LIGACOES_FILE = path.join(DATA_DIR, "ligacoes.json");

function pushoverConfigurado(): boolean {
  return Boolean(process.env.PUSHOVER_TOKEN && process.env.PUSHOVER_USER);
}

function twilioConfigurado(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM &&
      process.env.DISCADOR_PARA
  );
}

export function avisadorConfigurado(): boolean {
  return pushoverConfigurado() || twilioConfigurado();
}

/**
 * priority 2 = emergência: repete (retry) a cada 30 s por até 10 min (expire)
 * até você tocar na notificação. O som "persistent" insiste igual despertador.
 */
async function avisarPushover(titulo: string, horario: string): Promise<string> {
  const res = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: process.env.PUSHOVER_TOKEN!,
      user: process.env.PUSHOVER_USER!,
      title: `⏰ ${titulo}`,
      message: `às ${horario} — daqui a ${ANTECEDENCIA_MIN} minutos.`,
      priority: "2",
      retry: "30",
      expire: "600",
      sound: "persistent",
    }),
  });

  if (!res.ok) {
    throw new Error(`Pushover (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return String(data.request || "");
}

function escaparXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function ligarTwilio(titulo: string, horario: string): Promise<string> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const fala = `Olá! Lembrete da sua agenda: ${titulo}, às ${horario}. Repetindo: ${titulo}, às ${horario}. Bom compromisso!`;
  const twiml = `<Response><Pause length="1"/><Say language="pt-BR">${escaparXml(fala)}</Say></Response>`;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString(
            "base64"
          ),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: process.env.DISCADOR_PARA!,
        From: process.env.TWILIO_FROM!,
        Twiml: twiml,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Twilio (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.sid || "";
}

let rodando = false;

export async function dispararAvisos(): Promise<void> {
  if (rodando || !avisadorConfigurado()) return;
  rodando = true;

  try {
    const agora = Date.now();
    const limite = agora + ANTECEDENCIA_MIN * 60_000;

    const notas = await getNotes("processado");
    const candidatas = notas.filter((n) => {
      const ev = n.evento;
      if (!ev?.ligar || ev.diaInteiro) return false;
      const inicio = new Date(ev.inicio).getTime();
      return inicio > agora && inicio <= limite;
    });

    if (candidatas.length === 0) return;

    await withLock(LIGACOES_FILE, async () => {
      const historico = await readJson<Aviso[]>(LIGACOES_FILE, []);

      for (const nota of candidatas) {
        const ev = nota.evento!;
        if (historico.some((l) => l.eventoId === ev.googleEventId)) continue;

        const canal: Aviso["canal"] = pushoverConfigurado()
          ? "pushover"
          : "twilio";
        const registro: Aviso = {
          eventoId: ev.googleEventId,
          notaId: nota.id,
          titulo: ev.titulo,
          inicioEvento: ev.inicio,
          chamadaEm: new Date().toISOString(),
          canal,
        };

        try {
          const horario = new Date(ev.inicio).toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            hour: "2-digit",
            minute: "2-digit",
          });
          const tituloFalado = ev.titulo.replace(/\s*-\s*Me Ligue\s*$/i, "");
          registro.providerId =
            canal === "pushover"
              ? await avisarPushover(tituloFalado, horario)
              : await ligarTwilio(tituloFalado, horario);
        } catch (err) {
          registro.erro = err instanceof Error ? err.message : String(err);
          console.error(`[avisador] evento ${ev.googleEventId}:`, err);
        }

        // Registra mesmo em erro: melhor um aviso perdido que dez repetidos.
        historico.push(registro);
      }

      await writeJsonAtomic(LIGACOES_FILE, historico);
    });
  } finally {
    rodando = false;
  }
}
