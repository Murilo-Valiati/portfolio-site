import { SignJWT, importPKCS8 } from "jose";

/**
 * Acesso ao Google Calendar via service account — sem OAuth interativo, sem
 * dependência nova (o jose, que já assina a sessão do painel, assina o JWT).
 *
 * Setup (uma vez, no Google Cloud Console):
 *   1. Criar um projeto e ativar a Google Calendar API.
 *   2. Criar uma service account e gerar uma chave JSON.
 *   3. Compartilhar o SEU calendário com o e-mail da service account, com
 *      permissão "Fazer alterações em eventos".
 *   4. Definir no docker-compose da EC2:
 *      GOOGLE_SA_EMAIL           (client_email do JSON)
 *      GOOGLE_SA_PRIVATE_KEY_B64 (private_key do JSON, em base64 — evita o
 *                                 inferno de \n em variável de ambiente)
 *      GOOGLE_CALENDAR_ID        (seu e-mail do Gmail)
 *
 * Sem essas variáveis o worker fica inerte e nada muda no comportamento atual.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3";

export interface EventoGoogle {
  id: string;
  status: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export function googleConfigurado(): boolean {
  return Boolean(
    process.env.GOOGLE_SA_EMAIL &&
      (process.env.GOOGLE_SA_PRIVATE_KEY_B64 ||
        process.env.GOOGLE_SA_PRIVATE_KEY) &&
      process.env.GOOGLE_CALENDAR_ID
  );
}

function chavePrivadaPem(): string {
  const b64 = process.env.GOOGLE_SA_PRIVATE_KEY_B64;
  if (b64) return Buffer.from(b64, "base64").toString("utf-8");
  // Fallback: PEM direto na env, com \n literais.
  return (process.env.GOOGLE_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

let tokenCache: { valor: string; expiraEm: number } | null = null;

async function accessToken(): Promise<string> {
  // Margem de 5 min para nunca usar token à beira de expirar.
  if (tokenCache && tokenCache.expiraEm - 300_000 > Date.now()) {
    return tokenCache.valor;
  }

  const agora = Math.floor(Date.now() / 1000);
  const chave = await importPKCS8(chavePrivadaPem(), "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(process.env.GOOGLE_SA_EMAIL!)
    .setAudience(TOKEN_URL)
    .setIssuedAt(agora)
    .setExpirationTime(agora + 3600)
    .sign(chave);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  tokenCache = {
    valor: data.access_token,
    expiraEm: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return tokenCache.valor;
}

async function chamada(
  metodo: string,
  caminho: string,
  body?: unknown
): Promise<unknown> {
  const token = await accessToken();
  const calendario = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!);

  const res = await fetch(`${API}/calendars/${calendario}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `Google Calendar ${metodo} ${caminho} (${res.status}): ${await res.text()}`
    );
  }
  if (res.status === 204) return {};
  return res.json();
}

export interface NovoEvento {
  titulo: string;
  /** ISO com offset (com hora) ou "YYYY-MM-DD" (dia inteiro). */
  inicio: string;
  fim: string;
  diaInteiro: boolean;
}

function corpoDoEvento(ev: NovoEvento) {
  return {
    summary: ev.titulo,
    start: ev.diaInteiro
      ? { date: ev.inicio }
      : { dateTime: ev.inicio, timeZone: "America/Sao_Paulo" },
    end: ev.diaInteiro
      ? { date: ev.fim }
      : { dateTime: ev.fim, timeZone: "America/Sao_Paulo" },
  };
}

export async function criarEvento(ev: NovoEvento): Promise<EventoGoogle> {
  const criado = (await chamada("POST", "/events", corpoDoEvento(ev))) as
    | EventoGoogle
    | null;
  if (!criado?.id) throw new Error("Google não retornou o id do evento criado.");
  return criado;
}

export async function buscarEvento(id: string): Promise<EventoGoogle | null> {
  const ev = (await chamada("GET", `/events/${encodeURIComponent(id)}`)) as
    | EventoGoogle
    | null;
  if (!ev || ev.status === "cancelled") return null;
  return ev;
}

export async function listarEventos(
  timeMinISO: string,
  timeMaxISO: string
): Promise<EventoGoogle[]> {
  const query = new URLSearchParams({
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });
  const data = (await chamada("GET", `/events?${query}`)) as {
    items?: EventoGoogle[];
  } | null;
  return (data?.items || []).filter((e) => e.status !== "cancelled");
}

export async function excluirEvento(id: string): Promise<void> {
  await chamada("DELETE", `/events/${encodeURIComponent(id)}`);
}

export async function remarcarEvento(
  id: string,
  ev: NovoEvento
): Promise<EventoGoogle> {
  const atualizado = (await chamada(
    "PATCH",
    `/events/${encodeURIComponent(id)}`,
    corpoDoEvento(ev)
  )) as EventoGoogle | null;
  if (!atualizado?.id) throw new Error("Google não confirmou a remarcação.");
  return atualizado;
}
