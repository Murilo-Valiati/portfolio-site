import { processarFila } from "@/lib/agenda-worker";
import { dispararLigacoes } from "@/lib/discador";

/**
 * Cron interno do processo. O app roda como um único container Node de vida
 * longa, então setInterval basta — sem fila externa, sem systemd timer.
 *
 * A fila também é processada na hora em que uma nota chega (via after() na
 * rota); estes intervalos são a rede de segurança para retries e para o
 * discador, que é puramente temporal.
 */

const FILA_A_CADA_MS = 5 * 60_000;
const DISCADOR_A_CADA_MS = 60_000;

// Sobrevive ao hot-reload do dev, que reexecuta o register().
const FLAG = Symbol.for("portfolio.agendaCronIniciado");

export function iniciarCronDaAgenda(): void {
  const g = globalThis as unknown as Record<symbol, boolean>;
  if (g[FLAG]) return;
  g[FLAG] = true;

  const roda = (fn: () => Promise<void>, nome: string) => () =>
    fn().catch((err) => console.error(`[agenda-cron] ${nome}:`, err));

  setInterval(roda(processarFila, "fila"), FILA_A_CADA_MS);
  setInterval(roda(dispararLigacoes, "discador"), DISCADOR_A_CADA_MS);

  // Primeira passada logo após o boot, pra fila não esperar 5 minutos.
  setTimeout(roda(processarFila, "fila (boot)"), 10_000);
}
