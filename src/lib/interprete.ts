import { generateJson } from "@/lib/gemini";
import type { Note } from "@/lib/notes";

/**
 * O Brasil não tem mais horário de verão desde 2019, então o offset de
 * América/São Paulo é fixo. Se isso um dia mudar, este é o único lugar a tocar.
 */
export const OFFSET_SP = "-03:00";

export interface Interpretacao {
  acao: "criar" | "cancelar" | "alterar" | "consultar" | "nada";
  titulo: string;
  /** Para cancelar/alterar: o dia onde procurar o evento alvo. */
  dataAlvo: string | null;
  /** Para criar/alterar: a data (nova) do evento. Para consultar: o dia. */
  data: string | null;
  /** Para criar/alterar: a hora (nova). null = dia inteiro / não dita. */
  hora: string | null;
  duracaoMin: number | null;
  ligar: boolean;
  /** Minutos de antecedência do aviso ("me ligue 1h antes" = 60). null = padrão. */
  antecedenciaMin: number | null;
  confianca: number;
  pendencia: string | null;
}

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    acao: {
      type: "string",
      enum: ["criar", "cancelar", "alterar", "consultar", "nada"],
    },
    titulo: { type: "string" },
    dataAlvo: { type: "string", nullable: true },
    data: { type: "string", nullable: true },
    hora: { type: "string", nullable: true },
    duracaoMin: { type: "integer", nullable: true },
    ligar: { type: "boolean" },
    antecedenciaMin: { type: "integer", nullable: true },
    confianca: { type: "number" },
    pendencia: { type: "string", nullable: true },
  },
  required: ["acao", "titulo", "ligar", "confianca"],
} as const;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    itens: { type: "array", items: ITEM_SCHEMA },
  },
  required: ["itens"],
} as const;

/**
 * Cada regra deste prompt veio de um erro real da automação anterior.
 * Não relaxe nenhuma sem ler o histórico no CLAUDE.md.
 */
export const SISTEMA_INTERPRETADOR = [
  "Você interpreta notas de agenda ditadas por voz, em português do Brasil, e responde apenas JSON.",
  "",
  "FORMATO DA RESPOSTA:",
  '- Sempre {"itens": [...]} — um item por compromisso/comando. Uma nota como "amanhã: dentista 14h e mercado 17h" tem DOIS itens. A maioria das notas tem um só.',
  "",
  "REGRAS DE DATA (as mais importantes):",
  "- Datas relativas ('hoje', 'amanhã', 'quinta', 'em 3 horas') se resolvem a partir do MOMENTO EM QUE A NOTA FOI DITADA, que é fornecido junto ao texto — nunca a partir de agora. Uma nota ditada na quarta com 'amanhã' significa quinta, mesmo que você a esteja lendo no sábado.",
  "- Dia da semana sem qualificador ('quinta') é a PRÓXIMA ocorrência a partir do momento ditado. Se a nota foi ditada na própria quinta, é a quinta seguinte, a menos que o texto diga 'hoje'.",
  "- Hora sem nenhum dia mencionado significa o MESMO dia em que a nota foi ditada.",
  "- Durações relativas ('em 3 horas', 'daqui a 20 minutos') viram data+hora absolutas somando ao momento ditado.",
  "- Se o horário calculado já tiver passado, NÃO empurre para outro dia nem invente outro horário: retorne a data/hora calculadas exatamente como ditadas. O código decide o que fazer.",
  "- Data sem hora é permitida (evento de dia inteiro): retorne hora null.",
  "- Nunca invente data, hora ou duração que não estejam no texto. Na dúvida, use pendencia.",
  "",
  "AÇÕES:",
  "- criar: um compromisso ou lembrete novo. titulo = descrição limpa e curta (sem a data, sem 'me ligue'). 'Me lembra de pagar o boleto em 3 horas' = criar no horário calculado, com ligar true e antecedenciaMin 0 (avisar NA hora).",
  "- cancelar: o texto pede para desmarcar algo. titulo = o que desmarcar; dataAlvo = o dia do evento.",
  "- alterar: mudar horário/dia de algo existente. titulo = o evento; dataAlvo = dia onde ele está hoje; data/hora = novo momento.",
  "- consultar: o texto é uma PERGUNTA sobre a agenda ('o que tenho amanhã?', 'como está minha quinta?'). data = o dia perguntado; titulo = resumo curto da pergunta.",
  "- nada: o texto não é um comando de agenda (recado solto, pensamento). Use pendencia para explicar.",
  "",
  "LIGAÇÃO E ANTECEDÊNCIA:",
  "- 'me ligue' / 'me liga' / 'me lembra' e equivalentes: ligar = true, e essa parte NÃO entra no título.",
  "- 'me ligue 1 hora antes' → antecedenciaMin 60. 'me avise na hora' ou lembrete relativo ('em 3 horas') → antecedenciaMin 0. Sem menção → antecedenciaMin null (padrão do sistema).",
  "",
  "FORMATOS: data, dataAlvo em YYYY-MM-DD; hora em HH:MM (24h); duracaoMin só se o texto disser a duração; confianca entre 0 e 1 refletindo sua certeza real; pendencia = frase curta explicando qualquer ambiguidade ou informação faltante relevante, senão null.",
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

export function montarPromptNota(nota: Note): string {
  return [
    `Momento em que a nota foi ditada: ${descreverMomentoSP(nota.createdAt)} (horário de Brasília).`,
    `Nota: "${nota.text}"`,
  ].join("\n");
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Valida um item cru vindo de QUALQUER motor (Gemini ou Claude). */
export function validarItem(bruto: Record<string, unknown>): Interpretacao {
  const acao = bruto.acao;
  if (
    acao !== "criar" &&
    acao !== "cancelar" &&
    acao !== "alterar" &&
    acao !== "consultar" &&
    acao !== "nada"
  ) {
    throw new Error(`Interpretação com ação desconhecida: ${String(acao)}`);
  }

  const titulo = texto(bruto.titulo);
  if (!titulo && acao !== "nada" && acao !== "consultar") {
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

  const antecedencia =
    typeof bruto.antecedenciaMin === "number" &&
    bruto.antecedenciaMin >= 0 &&
    bruto.antecedenciaMin <= 24 * 60
      ? Math.round(bruto.antecedenciaMin)
      : null;

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
    antecedenciaMin: antecedencia,
    confianca: typeof bruto.confianca === "number" ? bruto.confianca : 0,
    pendencia: texto(bruto.pendencia),
  };
}

export function validarItens(bruto: unknown): Interpretacao[] {
  const itens = (bruto as { itens?: unknown })?.itens;
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error("Interpretação sem itens.");
  }
  return itens
    .slice(0, 5)
    .map((i) => validarItem(i as Record<string, unknown>));
}

/** Interpreta via Gemini. O worker tenta o Claude da assinatura antes. */
export async function interpretarNota(nota: Note): Promise<Interpretacao[]> {
  const bruto = await generateJson(
    montarPromptNota(nota),
    SISTEMA_INTERPRETADOR,
    RESPONSE_SCHEMA
  );
  return validarItens(bruto);
}
