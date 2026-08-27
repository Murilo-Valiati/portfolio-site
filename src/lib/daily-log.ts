import path from "path";
import { readJson, withLock, writeJsonAtomic } from "@/lib/json-store";

export interface DailyLogEntry {
  id: string;
  date: string;
  text: string;
  tags: string[];
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const LOG_FILE = path.join(DATA_DIR, "daily-log.json");

async function readEntries(): Promise<DailyLogEntry[]> {
  return readJson<DailyLogEntry[]>(LOG_FILE, []);
}

async function writeEntries(entries: DailyLogEntry[]): Promise<void> {
  await writeJsonAtomic(LOG_FILE, entries);
}

export async function getAllEntries(): Promise<DailyLogEntry[]> {
  const entries = await readEntries();
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

export async function addEntry(
  text: string,
  tags: string[]
): Promise<DailyLogEntry> {
  return withLock(LOG_FILE, async () => {
  const entries = await readEntries();
  const entry: DailyLogEntry = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    text,
    tags,
  };
  entries.push(entry);
  await writeEntries(entries);
  return entry;
  });
}
