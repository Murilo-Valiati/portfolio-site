"use client";

import { useEffect, useMemo, useState } from "react";
import type { DayEntry, Habit, HabitCategory } from "@/lib/agenda";

const COLORS = {
  bg: "#080b0f",
  frame: "#0d1117",
  panel: "#161b23",
  panel2: "#1d2430",
  line: "#262e3a",
  text: "#EDEAE0",
  muted: "#8B93A1",
  muted2: "#5c6472",
  gold: "#C89B3C",
  teal: "#3FA7A0",
  red: "#C1443C",
};

const CATEGORY_META: Record<
  HabitCategory,
  { label: string; icon: string; accent: string }
> = {
  ancora: { label: "Hábito Âncora", icon: "⚓", accent: COLORS.gold },
  bom: { label: "Bons Hábitos", icon: "↑", accent: COLORS.teal },
  mau: { label: "Maus Hábitos (evitar)", icon: "↓", accent: COLORS.red },
};

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
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return { weekday: WEEKDAYS[date.getDay()], label: `${d} ${MONTHS[m - 1]}` };
}

function Ring({
  cx,
  cy,
  r,
  strokeWidth,
  percent,
  color,
  labelSize = 20,
}: {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  percent: number;
  color: string;
  labelSize?: number;
}) {
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(Math.max(percent, 0), 100) / 100);
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.line} strokeWidth={strokeWidth} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text
        x={cx}
        y={cy + labelSize * 0.32}
        textAnchor="middle"
        fill={COLORS.text}
        fontFamily="var(--font-mono)"
        fontSize={labelSize}
        fontWeight={600}
      >
        {Math.round(percent)}%
      </text>
    </>
  );
}

function Checkbox({ state }: { state: "empty" | "done" | "avoided" }) {
  if (state === "done") {
    return (
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          background: COLORS.teal,
          border: `1.5px solid ${COLORS.teal}`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: COLORS.bg,
        }}
      >
        ✓
      </div>
    );
  }
  if (state === "avoided") {
    return (
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          background: "transparent",
          border: `1.5px solid ${COLORS.red}`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: COLORS.red,
        }}
      >
        —
      </div>
    );
  }
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        border: `1.5px solid ${COLORS.muted2}`,
        flexShrink: 0,
      }}
    />
  );
}

export function AgendaTracker() {
  const [tab, setTab] = useState<"painel" | "hoje" | "planejador">("painel");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dayEntry, setDayEntry] = useState<DayEntry | null>(null);
  const [recentDays, setRecentDays] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabitName, setNewHabitName] = useState<Record<HabitCategory, string>>({
    ancora: "",
    bom: "",
    mau: "",
  });

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const { weekday, label: dateLabel } = formatDateKey(todayKey);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/agenda/habits").then((r) => r.json()),
      fetch(`/api/admin/agenda/day?date=${todayKey}`).then((r) => r.json()),
      fetch("/api/admin/agenda/days?count=90").then((r) => r.json()),
    ]).then(([habitsData, dayData, daysData]) => {
      setHabits(habitsData.habits || []);
      setDayEntry(dayData.day);
      setRecentDays(daysData.days || []);
      setLoading(false);
    });
  }, [todayKey]);

  const checked = new Set(dayEntry?.checked || []);

  const byCategory = useMemo(() => {
    const groups: Record<HabitCategory, Habit[]> = { ancora: [], bom: [], mau: [] };
    for (const h of habits) groups[h.category].push(h);
    return groups;
  }, [habits]);

  function pct(category: HabitCategory) {
    const list = byCategory[category];
    if (list.length === 0) return 0;
    const done = list.filter((h) => checked.has(h.id)).length;
    return (done / list.length) * 100;
  }

  const overallPct = useMemo(() => {
    if (habits.length === 0) return 0;
    const done = habits.filter((h) => checked.has(h.id)).length;
    return (done / habits.length) * 100;
  }, [habits, checked]);

  const streak = useMemo(() => {
    const anchorHabits = byCategory.ancora;
    if (anchorHabits.length === 0) return 0;

    const byDate = new Map(recentDays.map((d) => [d.date, new Set(d.checked)]));
    // include today's live (possibly unsaved-to-list) state
    byDate.set(todayKey, checked);

    let count = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const key = toDateKey(cursor);
      const dayChecked = byDate.get(key);
      const allDone =
        !!dayChecked && anchorHabits.every((h) => dayChecked.has(h.id));
      if (!allDone) {
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
  }, [recentDays, byCategory.ancora, checked, todayKey]);

  async function toggleHabit(habitId: string) {
    const isChecked = checked.has(habitId);
    const next = new Set(checked);
    if (isChecked) next.delete(habitId);
    else next.add(habitId);
    setDayEntry({ date: todayKey, checked: Array.from(next) });

    await fetch("/api/admin/agenda/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayKey, habitId, checked: !isChecked }),
    });
  }

  async function addHabit(category: HabitCategory) {
    const name = newHabitName[category].trim();
    if (!name) return;

    const res = await fetch("/api/admin/agenda/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });
    const data = await res.json();
    setHabits((prev) => [...prev, data.habit]);
    setNewHabitName((prev) => ({ ...prev, [category]: "" }));
  }

  async function removeHabit(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/admin/agenda/habits?id=${id}`, { method: "DELETE" });
  }

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.muted, padding: 40 }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "var(--font-body)" }}>
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          minHeight: "100vh",
          background: COLORS.frame,
          borderLeft: `1px solid ${COLORS.line}`,
          borderRight: `1px solid ${COLORS.line}`,
          color: COLORS.text,
        }}
      >
        <header style={{ padding: "26px 22px 16px", borderBottom: `1px solid ${COLORS.line}` }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: COLORS.gold,
              marginBottom: 8,
            }}
          >
            Agenda · Diário de Bordo
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26 }}>
            {weekday}
          </h1>
          <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 6, fontFamily: "var(--font-mono)" }}>
            {dateLabel}
          </p>
        </header>

        <div style={{ display: "flex", gap: 4, padding: "14px 22px 0", borderBottom: `1px solid ${COLORS.line}` }}>
          {(["painel", "hoje", "planejador"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "10px 4px 12px",
                fontSize: 12.5,
                color: tab === t ? COLORS.text : COLORS.muted,
                borderBottom: `2px solid ${tab === t ? COLORS.gold : "transparent"}`,
                background: "none",
                border: "none",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                borderBottomColor: tab === t ? COLORS.gold : "transparent",
                cursor: "pointer",
                fontWeight: 500,
                fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding: 22 }}>
          {tab === "painel" && (
            <PainelTab
              streak={streak}
              overallPct={overallPct}
              ancoraPct={pct("ancora")}
              bomPct={pct("bom")}
              mauPct={pct("mau")}
              onNavigate={setTab}
            />
          )}

          {tab === "hoje" && (
            <HojeTab
              byCategory={byCategory}
              checked={checked}
              overallPct={overallPct}
              onToggle={toggleHabit}
              onRemove={removeHabit}
              newHabitName={newHabitName}
              setNewHabitName={setNewHabitName}
              onAdd={addHabit}
            />
          )}

          {tab === "planejador" && (
            <PlanejadorTab
              habits={[...byCategory.ancora, ...byCategory.bom]}
              checked={checked}
              dateLabel={dateLabel}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PainelTab({
  streak,
  overallPct,
  ancoraPct,
  bomPct,
  mauPct,
  onNavigate,
}: {
  streak: number;
  overallPct: number;
  ancoraPct: number;
  bomPct: number;
  mauPct: number;
  onNavigate: (t: "painel" | "hoje" | "planejador") => void;
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
        <Stat label="sequência do hábito âncora" value={`${streak}d`} color={COLORS.gold} />
        <Stat label="progresso do dia" value={`${Math.round(overallPct)}%`} color={COLORS.teal} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 4px" }}>
        <svg viewBox="0 0 300 220" style={{ width: "100%", maxWidth: 300, height: "auto" }}>
          <Ring cx={150} cy={105} r={62} strokeWidth={10} percent={overallPct} color={COLORS.gold} labelSize={22} />
          <text x={150} y={128} textAnchor="middle" fill={COLORS.muted} fontFamily="var(--font-body)" fontSize={9} letterSpacing={1}>
            GERAL
          </text>

          <Ring cx={55} cy={175} r={30} strokeWidth={7} percent={ancoraPct} color={COLORS.gold} labelSize={12} />
          <Ring cx={245} cy={175} r={30} strokeWidth={7} percent={bomPct} color={COLORS.teal} labelSize={12} />

          <circle cx={245} cy={175} r={30} fill="none" stroke={COLORS.line} strokeWidth={7} style={{ opacity: 0 }} />

          <text x={55} y={215} textAnchor="middle" fill={COLORS.muted} fontFamily="var(--font-body)" fontSize={9}>
            ÂNCORA
          </text>
          <text x={245} y={215} textAnchor="middle" fill={COLORS.muted} fontFamily="var(--font-body)" fontSize={9}>
            BONS HÁBITOS
          </text>
        </svg>
      </div>

      <div
        style={{
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: COLORS.red,
          marginTop: -8,
          marginBottom: 20,
        }}
      >
        maus hábitos evitados hoje: {Math.round(mauPct)}%
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.muted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "10px 0 12px",
        }}
      >
        Navegar
      </div>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: "hidden" }}>
        <NavItem label="Hoje — checklist do dia" onClick={() => onNavigate("hoje")} />
        <NavItem label="Planejador — visão em cards" onClick={() => onNavigate("planejador")} last />
      </div>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function NavItem({ label, onClick, last }: { label: string; onClick: () => void; last?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "12px 14px",
        fontSize: 13.5,
        borderBottom: last ? "none" : `1px solid ${COLORS.line}`,
        background: "none",
        border: "none",
        borderBottomWidth: last ? 0 : 1,
        borderBottomStyle: "solid",
        borderBottomColor: COLORS.line,
        color: COLORS.text,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function HojeTab({
  byCategory,
  checked,
  overallPct,
  onToggle,
  onRemove,
  newHabitName,
  setNewHabitName,
  onAdd,
}: {
  byCategory: Record<HabitCategory, Habit[]>;
  checked: Set<string>;
  overallPct: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  newHabitName: Record<HabitCategory, string>;
  setNewHabitName: React.Dispatch<React.SetStateAction<Record<HabitCategory, string>>>;
  onAdd: (category: HabitCategory) => void;
}) {
  return (
    <>
      <div
        style={{
          height: 6,
          background: COLORS.panel2,
          borderRadius: 4,
          margin: "0 0 24px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${overallPct}%`,
            background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.teal})`,
            borderRadius: 4,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {(["ancora", "bom", "mau"] as const).map((category) => (
        <HabitCard
          key={category}
          category={category}
          habits={byCategory[category]}
          checked={checked}
          onToggle={onToggle}
          onRemove={onRemove}
          newName={newHabitName[category]}
          setNewName={(v) => setNewHabitName((prev) => ({ ...prev, [category]: v }))}
          onAdd={() => onAdd(category)}
        />
      ))}
    </>
  );
}

function HabitCard({
  category,
  habits,
  checked,
  onToggle,
  onRemove,
  newName,
  setNewName,
  onAdd,
}: {
  category: HabitCategory;
  habits: Habit[];
  checked: Set<string>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  newName: string;
  setNewName: (v: string) => void;
  onAdd: () => void;
}) {
  const meta = CATEGORY_META[category];
  const isAnchor = category === "ancora";
  const isMau = category === "mau";

  return (
    <div
      style={{
        border: `1px solid ${isAnchor ? "rgba(200,155,60,0.4)" : COLORS.line}`,
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        background: isAnchor
          ? `linear-gradient(180deg, rgba(200,155,60,0.08), transparent), ${COLORS.panel}`
          : COLORS.panel,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: isAnchor ? COLORS.gold : COLORS.muted,
          marginBottom: 10,
        }}
      >
        <span>{meta.icon}</span>
        <span>{meta.label}</span>
      </div>

      {habits.length === 0 && (
        <p style={{ fontSize: 12.5, color: COLORS.muted2, marginBottom: 10 }}>
          Nenhum hábito cadastrado ainda.
        </p>
      )}

      {habits.map((h, i) => {
        const isChecked = checked.has(h.id);
        return (
          <div
            key={h.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 0",
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.line}`,
              fontSize: 13.5,
            }}
          >
            <button
              onClick={() => onToggle(h.id)}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
              aria-label={isChecked ? "Desmarcar" : "Marcar"}
            >
              <Checkbox state={isChecked ? (isMau ? "avoided" : "done") : "empty"} />
            </button>
            <span
              style={{
                flex: 1,
                color: isChecked && !isMau ? COLORS.muted : COLORS.text,
                textDecoration: isChecked && !isMau ? "line-through" : "none",
                textDecorationColor: COLORS.muted2,
              }}
            >
              {h.name}
            </span>
            <button
              onClick={() => onRemove(h.id)}
              style={{
                background: "none",
                border: "none",
                color: COLORS.muted2,
                fontSize: 11,
                cursor: "pointer",
                padding: "2px 4px",
              }}
              aria-label="Remover hábito"
            >
              remover
            </button>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd();
          }}
          placeholder={isAnchor ? "Novo hábito âncora..." : isMau ? "Novo hábito a evitar..." : "Novo bom hábito..."}
          style={{
            flex: 1,
            background: COLORS.panel2,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12.5,
            color: COLORS.text,
            outline: "none",
          }}
        />
        <button
          onClick={onAdd}
          style={{
            background: "none",
            border: `1px solid ${meta.accent}`,
            color: meta.accent,
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          + adicionar
        </button>
      </div>
    </div>
  );
}

function PlanejadorTab({
  habits,
  checked,
  dateLabel,
}: {
  habits: Habit[];
  checked: Set<string>;
  dateLabel: string;
}) {
  return (
    <>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.muted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "0 0 12px",
        }}
      >
        Planejador diário
      </div>

      {habits.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.muted2 }}>
          Adicione hábitos de âncora ou bons hábitos na aba &quot;Hoje&quot; pra vê-los aqui como cards.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {habits.map((h) => {
            const done = checked.has(h.id);
            return (
              <div
                key={h.id}
                style={{
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: COLORS.panel,
                }}
              >
                <div
                  style={{
                    height: 64,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    background: `linear-gradient(160deg, ${h.category === "ancora" ? "#2a2116" : "#17272a"}, ${COLORS.panel})`,
                  }}
                >
                  {h.emoji || (h.category === "ancora" ? "⚓" : "✓")}
                </div>
                <div style={{ padding: "10px 12px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{h.name}</div>
                  <div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, color: COLORS.muted }}>
                    <Checkbox state={done ? "done" : "empty"} />
                    {done ? "Feito" : "Pendente"} · {dateLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
