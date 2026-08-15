import { promises as fs } from "fs";
import path from "path";

export interface DailyLogEntry {
  id: string;
  date: string;
  text: string;
  tags: string[];
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const LOG_FILE = path.join(DATA_DIR, "daily-log.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readEntries(): Promise<DailyLogEntry[]> {
  try {
    const raw = await fs.readFile(LOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeEntries(entries: DailyLogEntry[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(LOG_FILE, JSON.stringify(entries, null, 2));
}

export async function getAllEntries(): Promise<DailyLogEntry[]> {
  const entries = await readEntries();
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

export async function addEntry(
  text: string,
  tags: string[]
): Promise<DailyLogEntry> {
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
}
