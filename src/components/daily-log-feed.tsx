"use client";

import { useMemo, useState } from "react";
import type { DailyLogEntry } from "@/lib/daily-log";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(iso) === dayKey(today.toISOString())) return "hoje";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "ontem";
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DailyLogFeed({ entries }: { entries: DailyLogEntry[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Tags ordenadas por frequência: é assim que padrão aparece.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.tags) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entries]);

  const visible = useMemo(
    () => (activeTag ? entries.filter((e) => e.tags.includes(activeTag)) : entries),
    [entries, activeTag]
  );

  const groups = useMemo(() => {
    const out: { label: string; items: DailyLogEntry[] }[] = [];
    for (const e of visible) {
      const label = dayLabel(e.date);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(e);
      else out.push({ label, items: [e] });
    }
    return out;
  }, [visible]);

  return (
    <section className="flex flex-col gap-6">
      {tagCounts.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] opacity-55">
            Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {tagCounts.map(([tag, count]) => {
              const on = activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(on ? null : tag)}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[12.5px] transition-colors ${
                    on
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-background)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {tag}
                  <span
                    className={`font-[family-name:var(--font-mono)] text-[10.5px] ${
                      on ? "opacity-70" : "opacity-45"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {activeTag && (
            <p className="text-[12.5px] opacity-55">
              Mostrando {visible.length}{" "}
              {visible.length === 1 ? "registro" : "registros"} com{" "}
              <span className="text-[var(--color-accent)]">{activeTag}</span>.{" "}
              <button
                onClick={() => setActiveTag(null)}
                className="underline underline-offset-2 hover:opacity-100"
              >
                limpar
              </button>
            </p>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-[14px] opacity-45">
          Nenhum registro ainda. Escreva o primeiro acima.
        </p>
      ) : (
        <div className="relative">
          <span
            className="absolute bottom-2 left-[7px] top-2 w-px bg-[var(--color-border)]"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-8">
            {groups.map((g) => (
              <div key={g.label} className="flex flex-col gap-3">
                <h3 className="pl-8 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em] opacity-40">
                  {g.label}
                </h3>
                {g.items.map((entry) => (
                  <article key={entry.id} className="relative pl-8">
                    <span
                      className="absolute left-0 top-[7px] h-[15px] w-[15px] rounded-full border-2 border-[var(--color-accent)] bg-[var(--color-background)]"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                        {entry.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-40">
                          {timeLabel(entry.date)}
                        </span>
                        {entry.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setActiveTag(tag)}
                            className="rounded-full border border-[var(--color-border)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-wider opacity-60 transition-opacity hover:border-[var(--color-accent)] hover:opacity-100"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
