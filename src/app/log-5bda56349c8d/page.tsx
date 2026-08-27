import type { Metadata } from "next";
import { getAllEntries } from "@/lib/daily-log";
import { DailyLogForm } from "@/components/daily-log-form";
import { DailyLogFeed } from "@/components/daily-log-feed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log do Dia",
  robots: { index: false, follow: false, nocache: true },
};

/** Dias seguidos, contando de hoje (ou de ontem, se hoje ainda não teve registro). */
function computeStreak(dates: string[]): number {
  const days = new Set(
    dates.map((d) => {
      const x = new Date(d);
      return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
    })
  );

  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const cursor = new Date();

  if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);

  let count = 0;
  while (days.has(key(cursor)) && count < 3650) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function sinceLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

export default async function DailyLogPage() {
  const entries = await getAllEntries();
  const streak = computeStreak(entries.map((e) => e.date));
  const last = entries[0];

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-6 py-10 text-[var(--color-foreground)] sm:px-10 sm:py-14">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-5 border-b border-[var(--color-border)] pb-8">
          <a
            href="/admin"
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)] hover:underline"
          >
            ← Painel · Log do Dia
          </a>

          <h1 className="font-[family-name:var(--font-display)] text-[38px] font-semibold leading-[1.05] sm:text-[46px]">
            Log do Dia
          </h1>

          <p className="max-w-xl text-[14px] leading-relaxed opacity-60">
            Treino, estudo, alimentação, sono, humor, tela. Escreva solto — as
            tags são o que deixa o padrão visível depois.
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-[family-name:var(--font-mono)] text-[12px]">
            <span className={streak > 0 ? "text-[var(--color-accent)]" : "opacity-55"}>
              {streak === 0
                ? "sem sequência"
                : `${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"}`}
            </span>
            <span className="opacity-25">/</span>
            <span className="opacity-55">
              {entries.length} {entries.length === 1 ? "registro" : "registros"}
            </span>
            {last && (
              <>
                <span className="opacity-25">/</span>
                <span className="opacity-55">último {sinceLabel(last.date)}</span>
              </>
            )}
          </div>
        </header>

        <DailyLogForm />

        <DailyLogFeed entries={entries} />
      </div>
    </main>
  );
}
