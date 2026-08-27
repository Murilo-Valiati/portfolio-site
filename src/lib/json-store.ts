import { promises as fs } from "fs";
import path from "path";

/**
 * Estes arquivos JSON são lidos e reescritos por inteiro a cada mutação. Sem
 * coordenação, duas requisições simultâneas podem ler o mesmo estado e a
 * segunda gravação desfaz a primeira — perdendo um registro em silêncio.
 *
 * O app roda como um único processo Node por container, então uma fila em
 * memória por arquivo basta para serializar as escritas.
 */
const chains = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();

  // Roda depois da anterior, tenha ela dado certo ou não.
  const result = previous.then(fn, fn);

  // A fila engole erros para que uma falha não trave as próximas operações.
  chains.set(
    key,
    result.then(
      () => undefined,
      () => undefined
    )
  );

  return result;
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

/**
 * Grava num temporário e renomeia. O rename é atômico no mesmo sistema de
 * arquivos, então quem estiver lendo vê o conteúdo antigo ou o novo — nunca
 * um arquivo truncado.
 */
export async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });

  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}
