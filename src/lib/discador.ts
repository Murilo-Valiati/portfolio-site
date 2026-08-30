import path from "path";
import { readJson, withLock, writeJsonAtomic } from "@/lib/json-store";
import { getNotes } from "@/lib/notes";

/**
 * Liga para você 15 minutos antes de eventos marcados com "me ligue".
 *
 * DORMANTE até estas variáveis existirem no docker-compose da EC2:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 *   TWILIO_FROM (número Twilio, formato +55...),
 *   DISCADOR_PARA (seu celular, formato +55...)
 *
 * Enquanto dormante, o sufixo " - Me Ligue" nos títulos mantém o fluxo atual
 * do Toki funcionando — nada quebra na transição.
 *
 * V1 sem retentativa: uma ligação por evento, registrada em ligacoes.json
 * para nunca ligar duas vezes. Se não atender, o evento continua na agenda.
 */

const ANTECEDENCIA_MIN = 15;

interface Ligacao {
  eventoId: string;
  notaId: string;
  titulo: string;
  inicioEvento: string;
  chamadaEm: string;
  twilioSid?: string;
  erro?: string;
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const LIGACOES_FILE = path.join(DATA_DIR, "ligacoes.json");

export function discadorConfigurado(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM &&
      process.env.DISCADOR_PARA
  );
}

function escaparXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function ligar(titulo: string, horario: string): Promise<string> {
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

export async function dispararLigacoes(): Promise<void> {
  if (rodando || !discadorConfigurado()) return;
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
      const historico = await readJson<Ligacao[]>(LIGACOES_FILE, []);

      for (const nota of candidatas) {
        const ev = nota.evento!;
        if (historico.some((l) => l.eventoId === ev.googleEventId)) continue;

        const registro: Ligacao = {
          eventoId: ev.googleEventId,
          notaId: nota.id,
          titulo: ev.titulo,
          inicioEvento: ev.inicio,
          chamadaEm: new Date().toISOString(),
        };

        try {
          const horario = new Date(ev.inicio).toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            hour: "2-digit",
            minute: "2-digit",
          });
          const tituloFalado = ev.titulo.replace(/\s*-\s*Me Ligue\s*$/i, "");
          registro.twilioSid = await ligar(tituloFalado, horario);
        } catch (err) {
          registro.erro = err instanceof Error ? err.message : String(err);
          console.error(`[discador] evento ${ev.googleEventId}:`, err);
        }

        // Registra mesmo em erro: melhor uma ligação perdida que dez repetidas.
        historico.push(registro);
      }

      await writeJsonAtomic(LIGACOES_FILE, historico);
    });
  } finally {
    rodando = false;
  }
}
