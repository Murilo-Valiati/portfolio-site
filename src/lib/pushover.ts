/**
 * Cliente Pushover compartilhado pelo avisador (emergência) e pela rotina
 * (resumo matinal e revisão semanal, prioridade normal).
 */

export function pushoverConfigurado(): boolean {
  return Boolean(process.env.PUSHOVER_TOKEN && process.env.PUSHOVER_USER);
}

export interface MensagemPushover {
  titulo: string;
  mensagem: string;
  /** -1 silenciosa · 0 normal · 1 alta · 2 emergência (repete até confirmar). */
  prioridade?: -1 | 0 | 1 | 2;
  som?: string;
  /** URL aberta ao tocar na notificação (ex.: o painel). */
  url?: string;
  urlTitulo?: string;
}

export async function enviarPushover(m: MensagemPushover): Promise<string> {
  const corpo = new URLSearchParams({
    token: process.env.PUSHOVER_TOKEN!,
    user: process.env.PUSHOVER_USER!,
    title: m.titulo,
    message: m.mensagem,
    priority: String(m.prioridade ?? 0),
    ...(m.som ? { sound: m.som } : {}),
    ...(m.url ? { url: m.url } : {}),
    ...(m.urlTitulo ? { url_title: m.urlTitulo } : {}),
  });

  // Emergência exige cadência de repetição e prazo.
  if (m.prioridade === 2) {
    corpo.set("retry", "30");
    corpo.set("expire", "600");
  }

  const res = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });

  if (!res.ok) {
    throw new Error(`Pushover (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return String(data.request || "");
}
