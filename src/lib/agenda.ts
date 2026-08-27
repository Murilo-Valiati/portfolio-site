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
  return !habit.date || date >= habit.date;
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

export async function getDaysInRange(
  from: string,
  to: string
): Promise<DayEntry[]> {
  const days = await readDays();
  return days
    .filter((d) => d.date >= from && d.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date));
}
