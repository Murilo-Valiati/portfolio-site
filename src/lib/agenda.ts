import path from "path";
import { readJson, withLock, writeJsonAtomic } from "@/lib/json-store";

export type HabitCategory = "ancora" | "bom" | "mau";

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  emoji: string;
  /**
   * true  = repeats every day from `date` onward
   * false = belongs only to the single day in `date`
   *
   * Legacy entries saved before this field existed have it undefined and are
   * treated as recurring with no start date, i.e. visible on every day.
   */
  recurring?: boolean;
  /** YYYY-MM-DD. Start day when recurring, the only day when not. */
  date?: string;
  /**
   * Dias da semana em que o hábito vale (0=domingo … 6=sábado).
   * Ausente = todos os dias. "Não malho aos domingos" = [1,2,3,4,5,6].
   */
  dias?: number[];
}

export interface DayEntry {
  date: string; // YYYY-MM-DD
  checked: string[]; // habit ids
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const HABITS_FILE = path.join(DATA_DIR, "agenda-habits.json");
const DAYS_FILE = path.join(DATA_DIR, "agenda-days.json");

async function readHabits(): Promise<Habit[]> {
  return readJson<Habit[]>(HABITS_FILE, []);
}

async function writeHabits(habits: Habit[]): Promise<void> {
  await writeJsonAtomic(HABITS_FILE, habits);
}

async function readDays(): Promise<DayEntry[]> {
  return readJson<DayEntry[]>(DAYS_FILE, []);
}

async function writeDays(days: DayEntry[]): Promise<void> {
  await writeJsonAtomic(DAYS_FILE, days);
}

export async function getHabits(): Promise<Habit[]> {
  return readHabits();
}

export async function addHabit(
  name: string,
  category: HabitCategory,
  emoji: string,
  recurring: boolean,
  date: string
): Promise<Habit> {
  return withLock(HABITS_FILE, async () => {
    const habits = await readHabits();
    const habit: Habit = {
      id: crypto.randomUUID(),
      name,
      category,
      emoji,
      recurring,
      date,
    };
    habits.push(habit);
    await writeHabits(habits);
    return habit;
  });
}

/** Whether an item should show up on a given day. */
export function isVisibleOn(habit: Habit, date: string): boolean {
  const recurring = habit.recurring !== false;
  if (!recurring) return habit.date === date;
  if (habit.date && date < habit.date) return false;
  if (habit.dias && habit.dias.length > 0) {
    const diaSemana = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (!habit.dias.includes(diaSemana)) return false;
  }
  return true;
}

/** Define os dias da semana do hábito. null ou os 7 dias = todos. */
export async function updateHabitDias(
  id: string,
  dias: number[] | null
): Promise<Habit | null> {
  return withLock(HABITS_FILE, async () => {
    const habits = await readHabits();
    const habit = habits.find((h) => h.id === id);
    if (!habit) return null;

    if (dias === null || dias.length >= 7) delete habit.dias;
    else habit.dias = [...dias].sort((a, b) => a - b);

    await writeHabits(habits);
    return habit;
  });
}

export async function renameHabit(
  id: string,
  name: string
): Promise<Habit | null> {
  return withLock(HABITS_FILE, async () => {
    const habits = await readHabits();
    const habit = habits.find((h) => h.id === id);
    if (!habit) return null;

    habit.name = name;
    await writeHabits(habits);
    return habit;
  });
}

export async function deleteHabit(id: string): Promise<void> {
  return withLock(HABITS_FILE, async () => {
    const habits = await readHabits();
    await writeHabits(habits.filter((h) => h.id !== id));
  });
}

export async function getDayEntry(date: string): Promise<DayEntry> {
  const days = await readDays();
  return days.find((d) => d.date === date) || { date, checked: [] };
}

export async function toggleHabitForDay(
  date: string,
  habitId: string,
  checked: boolean
): Promise<DayEntry> {
  return withLock(DAYS_FILE, async () => {
    const days = await readDays();
    let day = days.find((d) => d.date === date);

    if (!day) {
      day = { date, checked: [] };
      days.push(day);
    }

    day.checked = checked
      ? Array.from(new Set([...day.checked, habitId]))
      : day.checked.filter((id) => id !== habitId);

    await writeDays(days);
    return day;
  });
}

export async function getRecentDays(count: number): Promise<DayEntry[]> {
  const days = await readDays();
  return [...days].sort((a, b) => b.date.localeCompare(a.date)).slice(0, count);
}

/**
 * Dias seguidos com TODOS os hábitos âncora cumpridos, contando de hoje (ou
 * de ontem, se hoje ainda não fechou). Mesma régua do tracker, no servidor —
 * para o resumo matinal.
 */
export async function calcularSequenciaAncora(): Promise<number> {
  const habits = await readHabits();
  const ancoras = habits.filter(
    (h) => h.category === "ancora" && h.recurring !== false
  );
  if (ancoras.length === 0) return 0;

  const days = await readDays();
  const mapa = new Map(days.map((d) => [d.date, new Set(d.checked)]));

  const hoje = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
  const anterior = (dia: string) => {
    const d = new Date(`${dia}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  };

  let cursor = hoje;
  let count = 0;
  for (let i = 0; i < 365; i++) {
    // Dia em que nenhuma âncora vale (ex.: domingo sem treino) não conta
    // nem quebra a corrente — a sequência "pula" ele.
    const visiveis = ancoras.filter((h) => isVisibleOn(h, cursor));
    if (visiveis.length === 0) {
      cursor = anterior(cursor);
      continue;
    }

    const checked = mapa.get(cursor);
    const fechou = !!checked && visiveis.every((h) => checked.has(h.id));
    if (!fechou) {
      if (cursor === hoje) {
        cursor = anterior(cursor);
        continue;
      }
      break;
    }
    count++;
    cursor = anterior(cursor);
  }
  return count;
}

export async function getDaysInRange(
  from: string,
  to: string
): Promise<DayEntry[]> {
  const days = await readDays();
  return days
    .filter((d) => d.date >= from && d.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date));
}
