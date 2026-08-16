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

const WEEKDAY_ABBR = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

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

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
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
  const [dayMap, setDayMap] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<HabitCategory, string>>({
    ancora: "",
    bom: "",
    mau: "",
  });

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const selected = useMemo(() => parseDateKey(selectedDate), [selectedDate]);
  const isToday = selectedDate === todayKey;

  function mergeDays(entries: DayEntry[]) {
    setDayMap((prev) => {
      const next = new Map(prev);
      for (const e of entries) next.set(e.date, new Set(e.checked));
      return next;
    });
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/agenda/habits").then((r) => r.json()),
      fetch(`/api/admin/agenda/days?count=${LEDGER_DAYS}`).then((r) => r.json()),
    ]).then(([h, ds]) => {
      setHabits(h.habits || []);
      mergeDays(ds.days || []);
      setLoading(false);
    });
  }, []);

  // Days for whichever month the calendar is showing.
  useEffect(() => {
    const from = toDateKey(new Date(viewMonth.year, viewMonth.month, 1));
    const to = toDateKey(new Date(viewMonth.year, viewMonth.month + 1, 0));
    fetch(`/api/admin/agenda/days?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((ds) => mergeDays(ds.days || []));
  }, [viewMonth]);

  const checked = useMemo(
    () => dayMap.get(selectedDate) ?? new Set<string>(),
    [dayMap, selectedDate]
  );

  const byCategory = useMemo(() => {
    const g: Record<HabitCategory, Habit[]> = { ancora: [], bom: [], mau: [] };
    for (const h of habits) g[h.category].push(h);
    return g;
  }, [habits]);

  const doneCount = habits.filter((h) => checked.has(h.id)).length;
  const overallPct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;

  const streak = useMemo(() => {
    const anchors = byCategory.ancora;
    if (anchors.length === 0) return 0;

    let count = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const key = toDateKey(cursor);
      const dayChecked = dayMap.get(key);
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
  }, [dayMap, byCategory.ancora, todayKey]);

  function goToToday() {
    const d = new Date();
    setSelectedDate(todayKey);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  async function toggle(habitId: string) {
    const isOn = checked.has(habitId);
    const next = new Set(checked);
    if (isOn) next.delete(habitId);
    else next.add(habitId);

    setDayMap((prev) => new Map(prev).set(selectedDate, next));

    await fetch("/api/admin/agenda/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, habitId, checked: !isOn }),
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

  async function renameHabit(id: string, name: string) {
    setHabits((p) => p.map((h) => (h.id === id ? { ...h, name } : h)));

    await fetch("/api/admin/agenda/habits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
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
          weekday={WEEKDAYS[selected.getDay()]}
          dayNum={selected.getDate()}
          month={MONTHS[selected.getMonth()]}
          year={selected.getFullYear()}
          isToday={isToday}
          onBackToToday={goToToday}
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
          onRename={renameHabit}
          onRemove={removeHabit}
          canEdit={isToday}
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
            onRename={renameHabit}
            onRemove={removeHabit}
            canEdit={isToday}
          />
          <HabitColumn
            category="mau"
            habits={byCategory.mau}
            checked={checked}
            draft={drafts.mau}
            setDraft={(v) => setDrafts((p) => ({ ...p, mau: v }))}
            onAdd={() => addHabit("mau")}
            onToggle={toggle}
            onRename={renameHabit}
            onRemove={removeHabit}
            canEdit={isToday}
          />
        </div>

        <Ledger habits={habits} historyByDate={dayMap} todayKey={todayKey} />

        <Calendar
          viewMonth={viewMonth}
          setViewMonth={setViewMonth}
          dayMap={dayMap}
          habitCount={habits.length}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          todayKey={todayKey}
        />
      </div>
    </main>
  );
}

function Header({
  weekday,
  dayNum,
  month,
  year,
  isToday,
  onBackToToday,
  streak,
  doneCount,
  total,
  overallPct,
}: {
  weekday: string;
  dayNum: number;
  month: string;
  year: number;
  isToday: boolean;
  onBackToToday: () => void;
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
          <p className="mt-2 flex flex-wrap items-center gap-3 font-[family-name:var(--font-mono)] text-sm opacity-60">
            <span>
              {dayNum} de {month} de {year}
            </span>
            {!isToday && (
              <button
                onClick={onBackToToday}
                className="rounded-full border border-[var(--color-accent)] px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-[var(--color-accent)] opacity-100 transition-colors hover:bg-[var(--color-accent)] hover:text-[var(--color-background)]"
              >
                voltar para hoje
              </button>
            )}
          </p>
        </div>

        <div className="flex items-end gap-10">
          <Metric value={String(streak)} unit="dias" label="âncora sustentada" emphasis />
          <Metric
            value={`${doneCount}/${total}`}
            unit=""
            label={isToday ? "marcados hoje" : "marcados nesse dia"}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        {!isToday && (
          <p className="text-[12.5px] opacity-55">
            Dia anterior: dá para marcar e desmarcar o que foi cumprido. Criar,
            renomear ou excluir hábitos só em hoje — a lista de hábitos é a mesma
            para todos os dias.
          </p>
        )}
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
  onRename,
  onRemove,
  canEdit,
  large,
}: {
  habit: Habit;
  on: boolean;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  canEdit: boolean;
  large?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [value, setValue] = useState(habit.name);

  function commit() {
    const next = value.trim();
    if (next && next !== habit.name) onRename(habit.id, next);
    else setValue(habit.name);
    setEditing(false);
  }

  function cancel() {
    setValue(habit.name);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-3">
        <Mark category={habit.category} on={on} />
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          aria-label={`Editar nome de ${habit.name}`}
          className={`${
            large ? "text-[17px]" : "text-[14.5px]"
          } min-w-0 flex-1 border-b border-[var(--color-accent)] bg-transparent py-1 leading-snug outline-none`}
        />
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3">
      <button
        onClick={() => onToggle(habit.id)}
        className="flex min-w-0 items-center gap-3 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
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

      {canEdit && (
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {confirmingRemove ? (
            <>
              <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-60">
                excluir de todos os dias?
              </span>
              <button
                onClick={() => onRemove(habit.id)}
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider text-[var(--color-accent)] underline"
                aria-label={`Confirmar exclusão de ${habit.name}`}
              >
                excluir
              </button>
              <button
                onClick={() => setConfirmingRemove(false)}
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-45 hover:opacity-100"
              >
                cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setValue(habit.name);
                  setEditing(true);
                }}
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-45 transition-opacity hover:underline hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Renomear ${habit.name}`}
              >
                editar
              </button>
              <button
                onClick={() => setConfirmingRemove(true)}
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-45 transition-opacity hover:underline hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Remover ${habit.name}`}
              >
                remover
              </button>
            </>
          )}
        </div>
      )}
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
  onRename,
  onRemove,
  canEdit,
}: {
  habits: Habit[];
  checked: Set<string>;
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  canEdit: boolean;
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
              onRename={onRename}
              onRemove={onRemove}
              canEdit={canEdit}
              large
            />
          ))}
        </div>
      )}

      {canEdit && (
        <AddHabit
          value={draft}
          onChange={setDraft}
          onAdd={onAdd}
          placeholder={copy.placeholder}
        />
      )}
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
  onRename,
  onRemove,
  canEdit,
}: {
  category: HabitCategory;
  habits: Habit[];
  checked: Set<string>;
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  canEdit: boolean;
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
              onRename={onRename}
              onRemove={onRemove}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <div className="mt-auto">
          <AddHabit
            value={draft}
            onChange={setDraft}
            onAdd={onAdd}
            placeholder={copy.placeholder}
          />
        </div>
      )}
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

function Calendar({
  viewMonth,
  setViewMonth,
  dayMap,
  habitCount,
  selectedDate,
  onSelect,
  todayKey,
}: {
  viewMonth: { year: number; month: number };
  setViewMonth: (v: { year: number; month: number }) => void;
  dayMap: Map<string, Set<string>>;
  habitCount: number;
  selectedDate: string;
  onSelect: (date: string) => void;
  todayKey: string;
}) {
  const { year, month } = viewMonth;

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = first.getDay();

    const out: (string | null)[] = Array(blanks).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(toDateKey(new Date(year, month, d)));
    }
    return out;
  }, [year, month]);

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  const navBtn =
    "flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] font-[family-name:var(--font-mono)] text-sm transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]";

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionLabel>Histórico</SectionLabel>
        <p className="text-[12.5px] opacity-55">
          Escolha um dia para ver ou corrigir o registro dele.
        </p>
      </div>

      <div className="w-full max-w-[360px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-display)] text-[19px] font-semibold capitalize">
            {MONTHS[month]} <span className="opacity-45">{year}</span>
          </h3>
          <div className="flex gap-2">
            <button onClick={() => shift(-1)} className={navBtn} aria-label="Mês anterior">
              ‹
            </button>
            <button onClick={() => shift(1)} className={navBtn} aria-label="Próximo mês">
              ›
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {WEEKDAY_ABBR.map((w) => (
            <div
              key={w}
              className="text-center font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider opacity-40"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} />;

            const done = dayMap.get(date)?.size ?? 0;
            const ratio = habitCount > 0 ? Math.min(done / habitCount, 1) : 0;
            const isFuture = date > todayKey;
            const isSelected = date === selectedDate;
            const isToday = date === todayKey;
            const dayNum = Number(date.slice(-2));

            return (
              <button
                key={date}
                onClick={() => onSelect(date)}
                disabled={isFuture}
                aria-current={isSelected ? "date" : undefined}
                aria-label={`${dayNum} — ${done} de ${habitCount} marcados`}
                style={
                  ratio > 0
                    ? {
                        backgroundColor: `color-mix(in srgb, var(--color-accent) ${Math.round(
                          12 + ratio * 68
                        )}%, transparent)`,
                      }
                    : undefined
                }
                className={`relative flex aspect-square items-center justify-center rounded-md border font-[family-name:var(--font-mono)] text-[11.5px] transition-all ${
                  isSelected
                    ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                    : "border-[var(--color-border)]"
                } ${isFuture ? "cursor-default opacity-25" : "hover:border-[var(--color-accent)]"} ${
                  ratio > 0.5 ? "font-semibold" : ""
                }`}
              >
                {dayNum}
                {isToday && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--color-accent)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
