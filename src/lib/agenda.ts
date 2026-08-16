import { promises as fs } from "fs";
import path from "path";

export type HabitCategory = "ancora" | "bom" | "mau";

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  emoji: string;
}

export interface DayEntry {
  date: string; // YYYY-MM-DD
  checked: string[]; // habit ids
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const HABITS_FILE = path.join(DATA_DIR, "agenda-habits.json");
const DAYS_FILE = path.join(DATA_DIR, "agenda-days.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readHabits(): Promise<Habit[]> {
  try {
    const raw = await fs.readFile(HABITS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeHabits(habits: Habit[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(HABITS_FILE, JSON.stringify(habits, null, 2));
}

async function readDays(): Promise<DayEntry[]> {
  try {
    const raw = await fs.readFile(DAYS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeDays(days: DayEntry[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DAYS_FILE, JSON.stringify(days, null, 2));
}

export async function getHabits(): Promise<Habit[]> {
  return readHabits();
}

export async function addHabit(
  name: string,
  category: HabitCategory,
  emoji: string
): Promise<Habit> {
  const habits = await readHabits();
  const habit: Habit = { id: crypto.randomUUID(), name, category, emoji };
  habits.push(habit);
  await writeHabits(habits);
  return habit;
}

export async function renameHabit(
  id: string,
  name: string
): Promise<Habit | null> {
  const habits = await readHabits();
  const habit = habits.find((h) => h.id === id);
  if (!habit) return null;

  habit.name = name;
  await writeHabits(habits);
  return habit;
}

export async function deleteHabit(id: string): Promise<void> {
  const habits = await readHabits();
  await writeHabits(habits.filter((h) => h.id !== id));
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
