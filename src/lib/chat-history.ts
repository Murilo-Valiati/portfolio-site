import { promises as fs } from "fs";
import path from "path";
import type { ChatMessage } from "@/lib/gemini";

interface ChatHistoryStore {
  [sessionId: string]: {
    [threadKey: string]: ChatMessage[];
  };
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const CHAT_HISTORY_FILE = path.join(DATA_DIR, "chat-history.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore(): Promise<ChatHistoryStore> {
  try {
    const raw = await fs.readFile(CHAT_HISTORY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeStore(store: ChatHistoryStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(store, null, 2));
}

export async function getChatHistory(
  sessionId: string,
  threadKey: string
): Promise<ChatMessage[]> {
  const store = await readStore();
  return store[sessionId]?.[threadKey] ?? [];
}

export async function appendChatExchange(
  sessionId: string,
  threadKey: string,
  userText: string,
  modelText: string
): Promise<ChatMessage[]> {
  const store = await readStore();
  if (!store[sessionId]) store[sessionId] = {};
  if (!store[sessionId][threadKey]) store[sessionId][threadKey] = [];
  store[sessionId][threadKey].push(
    { role: "user", text: userText },
    { role: "model", text: modelText }
  );
  await writeStore(store);
  return store[sessionId][threadKey];
}
