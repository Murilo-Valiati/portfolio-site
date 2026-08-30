import path from "path";
import { readJson, withLock, writeJsonAtomic } from "@/lib/json-store";
import type { Interpretacao } from "@/lib/interprete";

/**
 * "pendente"   -> na fila, o worker ainda vai aplicar.
 * "processado" -> evento confirmado no calendário (ou despachada à mão).
 * "aguardando" -> o worker parou de propósito e precisa de você (horário já
 *                 passou, evento ambíguo, sem horário para ligação…). Nunca é
 *                 retomada sozinha: reabrir pelo painel devolve pra fila.
 * "erro"       -> o worker tentou 3 vezes e falhou (rede, API fora…).
 */
export type NoteStatus = "pendente" | "processado" | "aguardando" | "erro";

export interface EventoDaNota {
  googleEventId: string;
  titulo: string;
  /** ISO com offset, ou "YYYY-MM-DD" para evento de dia inteiro. */
  inicio: string;
  fim: string;
  diaInteiro: boolean;
  ligar: boolean;
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  status: NoteStatus;
  /** Set when the note flips to "processado". */
  processedAt?: string;
  /** Evento criado/encontrado no Google Agenda por esta nota. */
  evento?: EventoDaNota;
  /**
   * Cache da interpretação do Gemini: um retry por falha técnica no calendário
   * não gasta outra chamada de IA. Reabrir a nota limpa o cache de propósito,
   * pra "tentar de novo" incluir uma nova interpretação.
   */
  interpretacao?: Interpretacao;
  /** Motivo humano de um "aguardando"/"erro", exibido no painel. */
  aviso?: string;
  /** Tentativas de processamento que falharam com erro técnico. */
  tentativas?: number;
  /** Quem despachou: o worker do site ou a automação externa (Cowork). */
  processadoPor?: "site" | "externo";
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const NOTES_FILE = path.join(DATA_DIR, "notas.json");

async function readNotes(): Promise<Note[]> {
  return readJson<Note[]>(NOTES_FILE, []);
}

async function writeNotes(notes: Note[]): Promise<void> {
  await writeJsonAtomic(NOTES_FILE, notes);
}

/** Newest first. Optionally filtered by status. */
export async function getNotes(status?: NoteStatus): Promise<Note[]> {
  const notes = await readNotes();
  const filtered = status ? notes.filter((n) => n.status === status) : notes;
  return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addNote(text: string): Promise<Note> {
  return withLock(NOTES_FILE, async () => {
    const notes = await readNotes();
    const note: Note = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
      status: "pendente",
    };
    notes.push(note);
    await writeNotes(notes);
    return note;
  });
}

export async function setNoteStatus(
  id: string,
  status: NoteStatus
): Promise<Note | null> {
  return withLock(NOTES_FILE, async () => {
    const notes = await readNotes();
    const note = notes.find((n) => n.id === id);
    if (!note) return null;

    note.status = status;
    if (status === "processado") note.processedAt = new Date().toISOString();
    else delete note.processedAt;

    // Reabrir limpa o rastro da tentativa anterior para o worker recomeçar do
    // zero. O evento fica: se ele ainda existir no Google, o worker o adota em
    // vez de duplicar.
    if (status === "pendente") {
      delete note.aviso;
      delete note.tentativas;
      delete note.processadoPor;
      delete note.interpretacao;
    }

    await writeNotes(notes);
    return note;
  });
}

/**
 * Corrige o texto de uma nota (ex.: completar a hora que faltou) e a devolve
 * pra fila do zero: interpretação, evento e avisos anteriores não valem mais
 * para o texto novo.
 */
export async function updateNoteText(
  id: string,
  text: string
): Promise<Note | null> {
  return withLock(NOTES_FILE, async () => {
    const notes = await readNotes();
    const note = notes.find((n) => n.id === id);
    if (!note) return null;

    note.text = text;
    note.status = "pendente";
    delete note.processedAt;
    delete note.aviso;
    delete note.tentativas;
    delete note.processadoPor;
    delete note.interpretacao;
    delete note.evento;

    await writeNotes(notes);
    return note;
  });
}

/** Merge parcial usado pelo worker. Campos com `undefined` são removidos. */
export async function updateNote(
  id: string,
  patch: Partial<Omit<Note, "id" | "text" | "createdAt">>
): Promise<Note | null> {
  return withLock(NOTES_FILE, async () => {
    const notes = await readNotes();
    const note = notes.find((n) => n.id === id);
    if (!note) return null;

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        delete (note as unknown as Record<string, unknown>)[key];
      } else {
        (note as unknown as Record<string, unknown>)[key] = value;
      }
    }

    await writeNotes(notes);
    return note;
  });
}

export async function deleteNote(id: string): Promise<void> {
  return withLock(NOTES_FILE, async () => {
    const notes = await readNotes();
    await writeNotes(notes.filter((n) => n.id !== id));
  });
}
