"use client";

import { useEffect, useMemo, useState } from "react";
import type { DayEntry, Habit, HabitCategory } from "@/lib/agenda";

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const LEDGER_DAYS = 28;

const CATEGORY_COPY: Record<
  HabitCategory,
  { label: string; hint: string; placeholder: string; action: string }
> = {
  ancora: {
    label: "Âncora",
    hint: "O inegociável. Se só uma coisa acontecer hoje, é esta.",
    placeholder: "O que sustenta o resto do dia?",
    action: "Cumpri",
  },
  bom: {
    label: "Construir",
    hint: "O que você quer que vire padrão.",
    placeholder: "Novo hábito para construir",
    action: "Feito",
  },
  mau: {
    label: "Evitar",
    hint: "Marcar aqui é vitória: o dia passou sem isso.",
    placeholder: "Novo hábito para evitar",
    action: "Evitei",
  },
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const cursor = new Date();
  for (let i = 0; i < n; i++) {
    out.unshift(toDateKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return out;
}

export function AgendaTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dayEntry, setDayEntry] = useState<DayEntry | null>(null);
  const [recentDays, setRecentDays] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<HabitCategory, string>>({
    ancora: "",
    bom: "",
    mau: "",
  });

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/agenda/habits").then((r) => r.json()),
      fetch(`/api/admin/agenda/day?date=${todayKey}`).then((r) => r.json()),
      fetch(`/api/admin/agenda/days?count=${LEDGER_DAYS}`).then((r) => r.json()),
    ]).then(([h, d, ds]) => {
      setHabits(h.habits || []);
      setDayEntry(d.day);
      setRecentDays(ds.days || []);
      setLoading(false);
    });
  }, [todayKey]);

  const checked = useMemo(
    () => new Set(dayEntry?.checked || []),
    [dayEntry]
  );

  const byCategory = useMemo(() => {
    const g: Record<HabitCategory, Habit[]> = { ancora: [], bom: [], mau: [] };
    for (const h of habits) g[h.category].push(h);
    return g;
  }, [habits]);

  const doneCount = habits.filter((h) => checked.has(h.id)).length;
  const overallPct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;

  const historyByDate = useMemo(() => {
    const map = new Map<string, Set<string>>(
      recentDays.map((d) => [d.date, new Set(d.checked)])
    );
    map.set(todayKey, checked);
    return map;
  }, [recentDays, checked, todayKey]);

  const streak = useMemo(() => {
    const anchors = byCategory.ancora;
    if (anchors.length === 0) return 0;

    let count = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const key = toDateKey(cursor);
      const dayChecked = historyByDate.get(key);
      const held = !!dayChecked && anchors.every((h) => dayChecked.has(h.id));
      if (!held) {
        if (key === todayKey) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [historyByDate, byCategory.ancora, todayKey]);

  async function toggle(habitId: string) {
    const isOn = checked.has(habitId);
    const next = new Set(checked);
    if (isOn) next.delete(habitId);
    else next.add(habitId);
    setDayEntry({ date: todayKey, checked: Array.from(next) });

    await fetch("/api/admin/agenda/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayKey, habitId, checked: !isOn }),
    });
  }

  async function addHabit(category: HabitCategory) {
    const name = drafts[category].trim();
    if (!name) return;
    setDrafts((p) => ({ ...p, [category]: "" }));

    const res = await fetch("/api/admin/agenda/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });
    const data = await res.json();
    if (data.habit) setHabits((p) => [...p, data.habit]);
  }

  async function removeHabit(id: string) {
    setHabits((p) => p.filter((h) => h.id !== id));
    await fetch(`/api/admin/agenda/habits?id=${id}`, { method: "DELETE" });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--color-background)] px-6 py-16 text-[var(--color-foreground)]">
        <p className="mx-auto max-w-5xl font-[family-name:var(--font-mono)] text-sm opacity-60">
          Carregando…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-6 py-10 text-[var(--color-foreground)] sm:px-10 sm:py-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <Header
          weekday={WEEKDAYS[today.getDay()]}
          dayNum={today.getDate()}
          month={MONTHS[today.getMonth()]}
          streak={streak}
          doneCount={doneCount}
          total={habits.length}
          overallPct={overallPct}
        />

        <AnchorSection
          habits={byCategory.ancora}
          checked={checked}
          draft={drafts.ancora}
          setDraft={(v) => setDrafts((p) => ({ ...p, ancora: v }))}
          onAdd={() => addHabit("ancora")}
          onToggle={toggle}
          onRemove={removeHabit}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <HabitColumn
            category="bom"
            habits={byCategory.bom}
            checked={checked}
            draft={drafts.bom}
            setDraft={(v) => setDrafts((p) => ({ ...p, bom: v }))}
            onAdd={() => addHabit("bom")}
            onToggle={toggle}
            onRemove={removeHabit}
          />
          <HabitColumn
            category="mau"
            habits={byCategory.mau}
            checked={checked}
            draft={drafts.mau}
            setDraft={(v) => setDrafts((p) => ({ ...p, mau: v }))}
            onAdd={() => addHabit("mau")}
            onToggle={toggle}
            onRemove={removeHabit}
          />
        </div>

        <Ledger habits={habits} historyByDate={historyByDate} todayKey={todayKey} />
      </div>
    </main>
  );
}

function Header({
  weekday,
  dayNum,
  month,
  streak,
  doneCount,
  total,
  overallPct,
}: {
  weekday: string;
  dayNum: number;
  month: string;
  streak: number;
  doneCount: number;
  total: number;
  overallPct: number;
}) {
  return (
    <header className="flex flex-col gap-8 border-b border-[var(--color-border)] pb-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <a
            href="/admin"
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)] hover:underline"
          >
            ← Painel · Agenda
          </a>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[38px] font-semibold leading-[1.05] sm:text-[46px]">
            {weekday}
          </h1>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-sm opacity-60">
            {dayNum} de {month}
          </p>
        </div>

        <div className="flex items-end gap-10">
          <Metric value={String(streak)} unit="dias" label="âncora sustentada" emphasis />
          <Metric value={`${doneCount}/${total}`} unit="" label="marcados hoje" />
        </div>
      </div>

      <div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>
    </header>
  );
}

function Metric({
  value,
  unit,
  label,
  emphasis,
}: {
  value: string;
  unit: string;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-[family-name:var(--font-mono)] text-[34px] font-semibold leading-none ${
            emphasis ? "text-[var(--color-accent)]" : ""
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="font-[family-name:var(--font-mono)] text-xs opacity-50">{unit}</span>
        )}
      </div>
      <div className="mt-2 text-[12.5px] opacity-60">{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] opacity-55">
      {children}
    </h2>
  );
}

function Mark({
  category,
  on,
}: {
  category: HabitCategory;
  on: boolean;
}) {
  const base =
    "flex shrink-0 items-center justify-center transition-all duration-200 motion-reduce:transition-none";

  if (category === "ancora") {
    return (
      <span
        className={`${base} h-7 w-7 rounded-[9px] border-2 ${
          on
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
            : "border-[var(--color-accent)]/45 bg-transparent"
        }`}
      >
        {on && (
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <path
              d="M3 8.5l3.2 3.2L13 5"
              stroke="var(--color-background)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    );
  }

  if (category === "mau") {
    return (
      <span
        className={`${base} h-[22px] w-[22px] rounded-full border-2 ${
          on
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/15"
            : "border-[var(--color-border)] bg-transparent"
        }`}
      >
        {on && <span className="h-[2.5px] w-[10px] rounded-full bg-[var(--color-accent)]" />}
      </span>
    );
  }

  return (
    <span
      className={`${base} h-[22px] w-[22px] rounded-md border-2 ${
        on
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-transparent"
      }`}
    >
      {on && (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
          <path
            d="M3 8.5l3.2 3.2L13 5"
            stroke="var(--color-background)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function HabitRow({
  habit,
  on,
  onToggle,
  onRemove,
  large,
}: {
  habit: Habit;
  on: boolean;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  large?: boolean;
}) {
  return (
    <div className="group flex items-center gap-3">
      <button
        onClick={() => onToggle(habit.id)}
        className="flex items-center gap-3 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
        aria-pressed={on}
      >
        <Mark category={habit.category} on={on} />
        <span
          className={`${large ? "text-[17px]" : "text-[14.5px]"} leading-snug transition-opacity ${
            on ? "opacity-55" : "opacity-100"
          }`}
        >
          {habit.name}
        </span>
      </button>

      <button
        onClick={() => onRemove(habit.id)}
        className="ml-auto font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-0 transition-opacity hover:underline focus-visible:opacity-60 group-hover:opacity-45"
        aria-label={`Remover ${habit.name}`}
      >
        remover
      </button>
    </div>
  );
}

function AddHabit({
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAdd();
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-1 text-[14px] outline-none placeholder:opacity-40"
      />
      <button
        onClick={onAdd}
        disabled={!value.trim()}
        className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--color-accent)] transition-opacity hover:underline disabled:opacity-30 disabled:hover:no-underline"
      >
        adicionar
      </button>
    </div>
  );
}

function AnchorSection({
  habits,
  checked,
  draft,
  setDraft,
  onAdd,
  onToggle,
  onRemove,
}: {
  habits: Habit[];
  checked: Set<string>;
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const copy = CATEGORY_COPY.ancora;

  return (
    <section className="flex flex-col gap-5 rounded-[14px] border border-[var(--color-accent)]/35 bg-[var(--color-surface)] p-7 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionLabel>{copy.label}</SectionLabel>
        <p className="text-[12.5px] opacity-55">{copy.hint}</p>
      </div>

      {habits.length === 0 ? (
        <p className="text-[14.5px] opacity-45">
          Escolha o hábito que ancora o seu dia.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              on={checked.has(h.id)}
              onToggle={onToggle}
              onRemove={onRemove}
              large
            />
          ))}
        </div>
      )}

      <AddHabit
        value={draft}
        onChange={setDraft}
        onAdd={onAdd}
        placeholder={copy.placeholder}
      />
    </section>
  );
}

function HabitColumn({
  category,
  habits,
  checked,
  draft,
  setDraft,
  onAdd,
  onToggle,
  onRemove,
}: {
  category: HabitCategory;
  habits: Habit[];
  checked: Set<string>;
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const copy = CATEGORY_COPY[category];
  const done = habits.filter((h) => checked.has(h.id)).length;

  return (
    <section className="flex flex-col gap-5 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-7">
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>{copy.label}</SectionLabel>
        {habits.length > 0 && (
          <span className="font-[family-name:var(--font-mono)] text-[11.5px] opacity-45">
            {done}/{habits.length}
          </span>
        )}
      </div>

      <p className="-mt-2 text-[12.5px] opacity-55">{copy.hint}</p>

      {habits.length === 0 ? (
        <p className="text-[14px] opacity-45">Nada aqui ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              on={checked.has(h.id)}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      <div className="mt-auto">
        <AddHabit
          value={draft}
          onChange={setDraft}
          onAdd={onAdd}
          placeholder={copy.placeholder}
        />
      </div>
    </section>
  );
}

function Ledger({
  habits,
  historyByDate,
  todayKey,
}: {
  habits: Habit[];
  historyByDate: Map<string, Set<string>>;
  todayKey: string;
}) {
  const dates = useMemo(() => lastNDates(LEDGER_DAYS), []);

  if (habits.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionLabel>Constância · últimos {LEDGER_DAYS} dias</SectionLabel>
        <p className="text-[12.5px] opacity-55">
          Cada quadrado é um dia sustentado.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {habits.map((h) => (
            <div key={h.id} className="flex items-center gap-4 py-[3px]">
              <div className="w-[150px] shrink-0 truncate text-[13px] opacity-70 sm:w-[190px]">
                {h.name}
              </div>
              <div className="flex gap-[3px]">
                {dates.map((date) => {
                  const on = historyByDate.get(date)?.has(h.id) ?? false;
                  const isToday = date === todayKey;
                  return (
                    <span
                      key={date}
                      title={date}
                      className={`h-[13px] w-[13px] rounded-[3px] ${
                        on
                          ? h.category === "ancora"
                            ? "bg-[var(--color-accent)]"
                            : "bg-[var(--color-accent)]/60"
                          : "bg-[var(--color-border)]"
                      } ${isToday ? "ring-1 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-background)]" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
