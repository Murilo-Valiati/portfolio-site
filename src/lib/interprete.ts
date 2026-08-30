import { generateJson } from "@/lib/gemini";
import type { Note } from "@/lib/notes";

/**
 * O Brasil não tem mais horário de verão desde 2019, então o offset de
 * América/São Paulo é fixo. Se isso um dia mudar, este é o único lugar a tocar.
 */
export const OFFSET_SP = "-03:00";

export interface Interpretacao {
  acao: "criar" | "cancelar" | "alterar" | "nada";
  titulo: string;
  /** Para cancelar/alterar: o dia onde procurar o evento alvo. */
  dataAlvo: string | null;
  /** Para criar/alterar: a data (nova) do evento. */
  data: string | null;
  /** Para criar/alterar: a hora (nova). null = dia inteiro / não dita. */
  hora: string | null;
  duracaoMin: number | null;
  ligar: boolean;
  confianca: number;
  pendencia: string | null;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    acao: { type: "string", enum: ["criar", "cancelar", "alterar", "nada"] },
    titulo: { type: "string" },
    dataAlvo: { type: "string", nullable: true },
    data: { type: "string", nullable: true },
    hora: { type: "string", nullable: true },
    duracaoMin: { type: "integer", nullable: true },
    ligar: { type: "boolean" },
    confianca: { type: "number" },
    pendencia: { type: "string", nullable: true },
  },
  required: ["acao", "titulo", "ligar", "confianca"],
} as const;

/**
 * Cada regra deste prompt veio de um erro real da automação anterior.
 * Não relaxe nenhuma sem ler o histórico no CLAUDE.md.
 */
const SISTEMA = [
  "Você interpreta notas de agenda ditadas por voz, em português do Brasil, e responde apenas JSON.",
  "",
  "REGRAS DE DATA (as mais importantes):",
  "- Datas relativas ('hoje', 'amanhã', 'quinta') se resolvem a partir do MOMENTO EM QUE A NOTA FOI DITADA, que é fornecido junto ao texto — nunca a partir de agora. Uma nota ditada na quarta com 'amanhã' significa quinta, mesmo que você a esteja lendo no sábado.",
  "- Dia da semana sem qualificador ('quinta') é a PRÓXIMA ocorrência a partir do momento ditado. Se a nota foi ditada na própria quinta, é a quinta seguinte, a menos que o texto diga 'hoje'.",
  "- Hora sem nenhum dia mencionado significa o MESMO dia em que a nota foi ditada.",
  "- Se o horário calculado já tiver passado, NÃO empurre para outro dia nem invente outro horário: retorne a data/hora calculadas exatamente como ditadas. O código decide o que fazer.",
  "- Data sem hora é permitida (evento de dia inteiro): retorne hora null.",
  "- Nunca invente data, hora ou duração que não estejam no texto. Na dúvida, use pendencia.",
  "",
  "AÇÕES:",
  "- criar: um compromisso novo. titulo = descrição limpa e curta (sem a data, sem 'me ligue').",
  "- cancelar: o texto pede para desmarcar algo. titulo = o que desmarcar; dataAlvo = o dia do evento.",
  "- alterar: mudar horário/dia de algo existente. titulo = o evento; dataAlvo = dia onde ele está hoje; data/hora = novo momento.",
  "- nada: o texto não é um comando de agenda (recado solto, pensamento). Use pendencia para explicar.",
  "",
  "LIGAÇÃO:",
  "- Se o texto contiver 'me ligue', 'me liga', 'ligar para mim' ou equivalente, ligar = true e essa parte NÃO entra no título.",
  "",
  "FORMATOS: data e dataAlvo em YYYY-MM-DD; hora em HH:MM (24h); duracaoMin só se o texto disser a duração; confianca entre 0 e 1 refletindo sua certeza real; pendencia = frase curta explicando qualquer ambiguidade ou informação faltante relevante, senão null.",
].join("\n");

const DIAS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** "sexta-feira, 28/08/2026, 17:29" no fuso de São Paulo. */
export function descreverMomentoSP(iso: string): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value])
  );
  const weekday = parts.weekday || DIAS[d.getUTCDay()];
  return `${weekday}, ${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function interpretarNota(nota: Note): Promise<Interpretacao> {
  const prompt = [
    `Momento em que a nota foi ditada: ${descreverMomentoSP(nota.createdAt)} (horário de Brasília).`,
    `Nota: "${nota.text}"`,
  ].join("\n");

  const bruto = (await generateJson(prompt, SISTEMA, RESPONSE_SCHEMA)) as Record<
    string,
    unknown
  >;

  const acao = bruto.acao;
  if (
    acao !== "criar" &&
    acao !== "cancelar" &&
    acao !== "alterar" &&
    acao !== "nada"
  ) {
    throw new Error(`Interpretação com ação desconhecida: ${String(acao)}`);
  }

  const titulo = texto(bruto.titulo);
  if (!titulo && acao !== "nada") {
    throw new Error("Interpretação sem título.");
  }

  const data = texto(bruto.data);
  const dataAlvo = texto(bruto.dataAlvo);
  const hora = texto(bruto.hora);

  const reData = /^\d{4}-\d{2}-\d{2}$/;
  const reHora = /^\d{2}:\d{2}$/;
  if (data && !reData.test(data)) throw new Error(`Data inválida: ${data}`);
  if (dataAlvo && !reData.test(dataAlvo))
    throw new Error(`Data alvo inválida: ${dataAlvo}`);
  if (hora && !reHora.test(hora)) throw new Error(`Hora inválida: ${hora}`);

  return {
    acao,
    titulo: titulo || "",
    dataAlvo,
    data,
    hora,
    duracaoMin:
      typeof bruto.duracaoMin === "number" && bruto.duracaoMin > 0
        ? Math.round(bruto.duracaoMin)
        : null,
    ligar: bruto.ligar === true,
    confianca: typeof bruto.confianca === "number" ? bruto.confianca : 0,
    pendencia: texto(bruto.pendencia),
  };
}
