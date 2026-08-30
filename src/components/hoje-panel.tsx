"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface EventoDoDia {
  id: string;
  titulo: string;
  hora: string | null; // null = dia inteiro
  alarme: boolean;
}

export interface NotaAtencao {
  id: string;
  texto: string;
  aviso: string;
  erro: boolean;
}

export interface HabitoDoDia {
  id: string;
  nome: string;
  emoji: string;
  categoria: "ancora" | "bom" | "mau";
  feito: boolean;
}

const mono =
  "font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em]";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className={`${mono} opacity-45`}>{titulo}</h2>
      {children}
    </section>
  );
}

export function HojePanel({
  rotulo,
  data,
  eventos,
  atencao,
  pendentes,
  habitos,
}: {
  rotulo: string;
  data: string;
  eventos: EventoDoDia[] | null;
  atencao: NotaAtencao[];
  pendentes: number;
  habitos: HabitoDoDia[];
}) {
  const router = useRouter();
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(habitos.map((h) => [h.id, h.feito]))
  );
  const [reprocessadas, setReprocessadas] = useState<Set<string>>(new Set());

  async function toggleHabito(h: HabitoDoDia) {
    const novo = !checks[h.id];
    setChecks((prev) => ({ ...prev, [h.id]: novo }));
    await fetch("/api/admin/agenda/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: data, habitId: h.id, checked: novo }),
    }).catch(() => setChecks((prev) => ({ ...prev, [h.id]: !novo })));
  }

  async function tentarDeNovo(id: string) {
    setReprocessadas((prev) => new Set(prev).add(id));
    await fetch(`/api/notas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pendente" }),
    });
    setTimeout(() => router.refresh(), 4000);
  }

  const feitos = Object.values(checks).filter(Boolean).length;
  const planejados = habitos.filter((h) => h.categoria !== "mau").length;

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-6 py-10 text-[var(--color-foreground)] sm:px-10 sm:py-14">
      <div className="mx-auto flex max-w-2xl flex-col gap-9">
        <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-7">
          <a href="/admin" className={`${mono} text-[var(--color-accent)] hover:underline`}>
            ← Painel · Hoje
          </a>
          <h1 className="font-[family-name:var(--font-display)] text-[34px] font-semibold leading-[1.05] sm:text-[42px]">
            {rotulo}
          </h1>
        </header>

        <Secao titulo="Agenda do dia">
          {eventos === null ? (
            <p className="text-[14px] opacity-45">
              Não consegui falar com o Google Agenda agora.
            </p>
          ) : eventos.length === 0 ? (
            <p className="text-[14px] opacity-45">Agenda livre. Dia seu.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {eventos.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-baseline gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-accent)]">
                    {ev.hora ?? "dia todo"}
                  </span>
                  <span className="text-[15px]">{ev.titulo}</span>
                  {ev.alarme && (
                    <span title="Alarme 15 min antes" className="ml-auto">
                      🔔
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Secao>

        {(atencao.length > 0 || pendentes > 0) && (
          <Secao titulo="Notas">
            {atencao.map((n) => (
              <div
                key={n.id}
                className="flex flex-col gap-2 rounded-[12px] border border-amber-500/40 bg-[var(--color-surface)] px-4 py-3"
              >
                <p className="text-[14px]">{n.texto}</p>
                <p className="text-[13px] text-amber-500">
                  {n.erro ? "⚠ " : ""}
                  {n.aviso}
                </p>
                <div className="flex gap-4">
                  <a
                    href="/admin/notas"
                    className={`${mono} text-[var(--color-accent)] hover:underline`}
                  >
                    corrigir
                  </a>
                  <button
                    onClick={() => tentarDeNovo(n.id)}
                    disabled={reprocessadas.has(n.id)}
                    className={`${mono} text-[var(--color-accent)] hover:underline disabled:opacity-40`}
                  >
                    {reprocessadas.has(n.id) ? "reprocessando…" : "tentar de novo"}
                  </button>
                </div>
              </div>
            ))}
            {pendentes > 0 && (
              <p className="text-[13px] opacity-55">
                ⏳ {pendentes} na fila, sendo processada{pendentes > 1 ? "s" : ""}.
              </p>
            )}
          </Secao>
        )}

        {habitos.length > 0 && (
          <Secao titulo={`Hábitos · ${feitos}/${planejados}`}>
            <ul className="flex flex-col gap-1.5">
              {habitos.map((h) => {
                const feito = checks[h.id];
                const mau = h.categoria === "mau";
                return (
                  <li key={h.id}>
                    <button
                      onClick={() => toggleHabito(h)}
                      className={`flex w-full items-center gap-3 rounded-[10px] border px-4 py-2.5 text-left transition-colors ${
                        feito
                          ? mau
                            ? "border-red-400/50 bg-red-400/10"
                            : "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10"
                          : "border-[var(--color-border)] bg-[var(--color-surface)]"
                      }`}
                    >
                      <span>{h.emoji}</span>
                      <span
                        className={`text-[14.5px] ${feito && !mau ? "line-through opacity-55" : ""}`}
                      >
                        {h.nome}
                      </span>
                      <span className="ml-auto text-[13px] opacity-50">
                        {feito ? (mau ? "caí 😞" : "✓") : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Secao>
        )}

        <a
          href="/admin/notas"
          className="rounded-[12px] bg-[var(--color-accent)] px-5 py-3.5 text-center font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--color-background)]"
        >
          🎙️ Ditar nota
        </a>
      </div>
    </main>
  );
}
