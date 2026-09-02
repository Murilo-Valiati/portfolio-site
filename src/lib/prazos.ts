import path from "path";
import { readJson, withLock, writeJsonAtomic } from "@/lib/json-store";

export interface Prazo {
  id: string;
  titulo: string;
  /** YYYY-MM-DD — o dia da entrega, no fuso de São Paulo. */
  data: string;
  criadoEm: string;
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const PRAZOS_FILE = path.join(DATA_DIR, "prazos.json");

async function readPrazos(): Promise<Prazo[]> {
  return readJson<Prazo[]>(PRAZOS_FILE, []);
}

/** Mais próximo primeiro — é o que interessa ver no topo do dia. */
export async function getPrazos(): Promise<Prazo[]> {
  const prazos = await readPrazos();
  return [...prazos].sort((a, b) => a.data.localeCompare(b.data));
}

export async function addPrazo(titulo: string, data: string): Promise<Prazo> {
  return withLock(PRAZOS_FILE, async () => {
    const prazos = await readPrazos();
    const prazo: Prazo = {
      id: crypto.randomUUID(),
      titulo,
      data,
      criadoEm: new Date().toISOString(),
    };
    prazos.push(prazo);
    await writeJsonAtomic(PRAZOS_FILE, prazos);
    return prazo;
  });
}

export async function deletePrazo(id: string): Promise<void> {
  return withLock(PRAZOS_FILE, async () => {
    const prazos = await readPrazos();
    await writeJsonAtomic(
      PRAZOS_FILE,
      prazos.filter((p) => p.id !== id)
    );
  });
}

/**
 * Dias inteiros entre hoje e a data do prazo. Compara só a parte da data,
 * ancorando ao meio-dia UTC para que horário de verão não vire ou perca um dia.
 */
export function diasRestantes(dataPrazo: string, hojeSP: string): number {
  const meioDia = (d: string) => new Date(`${d}T12:00:00Z`).getTime();
  return Math.round((meioDia(dataPrazo) - meioDia(hojeSP)) / 86_400_000);
}

export function rotuloContagem(dias: number): string {
  if (dias === 0) return "é hoje";
  if (dias === 1) return "é amanhã";
  if (dias < 0) {
    const atraso = Math.abs(dias);
    return atraso === 1 ? "venceu ontem" : `venceu há ${atraso} dias`;
  }
  return `faltam ${dias} dias`;
}
