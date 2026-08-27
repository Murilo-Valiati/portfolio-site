import path from "path";
import { readJson, withLock, writeJsonAtomic } from "@/lib/json-store";

export type NoteStatus = "pendente" | "processado";

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  status: NoteStatus;
  /** Set when the note flips to "processado". */
  processedAt?: string;
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
