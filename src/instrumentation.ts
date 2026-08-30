export async function register() {
  // Só no servidor Node de verdade — nunca no edge nem durante o build.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { iniciarCronDaAgenda } = await import("@/lib/agenda-cron");
  iniciarCronDaAgenda();
}
