import path from "path";
import { readJson, withLock, writeJsonAtomic } from "@/lib/json-store";
import type { ChatMessage } from "@/lib/gemini";

/**
 * Histórico do tutor. Duas decisões da auditoria de 30/08:
 *
 * 1. Gravação via json-store (lock + rename atômico), como o resto do site —
 *    antes um crash no meio da escrita corrompia o arquivo e o catch → {}
 *    transformava a corrupção em perda total silenciosa.
 * 2. Identidade fixa: há um único aluno (o dono do site, já autenticado pelo
 *    painel). O antigo cookie anônimo criava um progresso por navegador.
 *    A migração abaixo funde os dados das sessões antigas na primeira leitura.
 */

const ALUNO = "aluno";

/** Guarda no máximo isto por thread — o excedente antigo é descartado. */
const MAX_MENSAGENS_POR_THREAD = 200;

interface ChatHistoryStore {
  [key: string]: {
    [threadKey: string]: ChatMessage[];
  };
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const CHAT_HISTORY_FILE = path.join(DATA_DIR, "chat-history.json");

/** Funde as sessões anônimas antigas na identidade fixa. Idempotente. */
function migrar(store: ChatHistoryStore): { store: ChatHistoryStore; mudou: boolean } {
  const chavesAntigas = Object.keys(store).filter((k) => k !== ALUNO);
  if (chavesAntigas.length === 0) return { store, mudou: false };

  const destino = store[ALUNO] ?? {};
  for (const chave of chavesAntigas) {
    for (const [threadKey, mensagens] of Object.entries(store[chave])) {
      destino[threadKey] = [...(destino[threadKey] ?? []), ...mensagens];
    }
  }
  return { store: { [ALUNO]: destino }, mudou: true };
}

async function lerStore(): Promise<ChatHistoryStore> {
  const bruto = await readJson<ChatHistoryStore>(CHAT_HISTORY_FILE, {});
  const { store, mudou } = migrar(bruto);
  if (mudou) await writeJsonAtomic(CHAT_HISTORY_FILE, store);
  return store;
}

export async function getChatHistory(threadKey: string): Promise<ChatMessage[]> {
  const store = await lerStore();
  return store[ALUNO]?.[threadKey] ?? [];
}

export async function appendChatExchange(
  threadKey: string,
  userText: string,
  modelText: string
): Promise<void> {
  await withLock(CHAT_HISTORY_FILE, async () => {
    const store = await lerStore();
    if (!store[ALUNO]) store[ALUNO] = {};
    const thread = store[ALUNO][threadKey] ?? [];
    thread.push({ role: "user", text: userText }, { role: "model", text: modelText });
    store[ALUNO][threadKey] = thread.slice(-MAX_MENSAGENS_POR_THREAD);
    await writeJsonAtomic(CHAT_HISTORY_FILE, store);
  });
}

export async function clearChatThread(threadKey: string): Promise<void> {
  await withLock(CHAT_HISTORY_FILE, async () => {
    const store = await lerStore();
    if (store[ALUNO]) delete store[ALUNO][threadKey];
    await writeJsonAtomic(CHAT_HISTORY_FILE, store);
  });
}

export async function deleteChatThreadsForCourse(courseId: string): Promise<void> {
  await withLock(CHAT_HISTORY_FILE, async () => {
    const store = await lerStore();
    const prefix = `${courseId}:`;
    for (const chave of Object.keys(store)) {
      for (const threadKey of Object.keys(store[chave])) {
        if (threadKey.startsWith(prefix)) delete store[chave][threadKey];
      }
    }
    await writeJsonAtomic(CHAT_HISTORY_FILE, store);
  });
}
