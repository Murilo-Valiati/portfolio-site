const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function generateContent(
  contents: { role: string; parts: ContentPart[] }[],
  systemInstruction?: string,
  generationConfig?: Record<string, unknown>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no servidor.");
  }

  const res = await fetch(
    `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
        ...(generationConfig ? { generationConfig } : {}),
      }),
      // Chamada pendurada não pode travar quem chamou — o worker da agenda,
      // por exemplo, ficaria com a fila presa até o container reiniciar.
      signal: AbortSignal.timeout(90_000),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Resposta da Gemini API sem texto.");
  }
  return text;
}

/**
 * Traduz um erro do Gemini em status HTTP + mensagem honesta pro usuário —
 * "tente novamente" quando a cota diária acabou é mentira que frustra.
 */
export function mapearErroGemini(err: unknown): { status: number; mensagem: string } {
  const texto = err instanceof Error ? err.message : String(err);
  if (texto.includes("(429)")) {
    return {
      status: 429,
      mensagem:
        "A cota diária gratuita de IA esgotou. Ela volta de madrugada (~4h) — tentar de novo agora não adianta.",
    };
  }
  if (/\((500|502|503|504)\)/.test(texto)) {
    return {
      status: 503,
      mensagem: "A IA está sobrecarregada neste momento. Tenta de novo em um minuto.",
    };
  }
  return {
    status: 502,
    mensagem: "Não foi possível gerar resposta agora. Tente novamente em instantes.",
  };
}

export function tutorSystemInstruction(courseContext?: string): string {
  return [
    "Você é um tutor especialista, com profundidade real nos assuntos que ensina (lógica de programação, estruturas de dados e fundamentos de IA), não um chatbot genérico de respostas superficiais.",
    "O aluno já tem uma base sólida em lógica de programação e estruturas de dados — não repita conceitos básicos dessa área sem necessidade. Em compensação, trate tecnologias web e infraestrutura como território mais novo pra ele: conecte conceitos novos a analogias com lógica/algoritmos que ele já domina sempre que ajudar a fixar o assunto.",
    "Ensine de forma estruturada: quando o tópico for amplo, quebre em passos ou etapas antes de aprofundar, e verifique o entendimento fazendo uma pergunta de verificação ocasional (não em toda resposta) em vez de só despejar informação.",
    "Calibre a profundidade da resposta pela pergunta: dúvidas pontuais recebem respostas diretas e objetivas; pedidos de explicação recebem desenvolvimento completo, com exemplo de código quando fizer sentido.",
    "Se a pergunta for ambígua ou vaga demais pra responder bem, peça uma pequena clarificação em vez de assumir e responder algo genérico.",
    "Responda sempre em português do Brasil, com tom direto e sem enrolação — nada de frases de efeito ou elogios vazios antes de ir ao ponto.",
    courseContext ? `Contexto do curso/lição atual: ${courseContext}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function tutorContents(history: ChatMessage[], message: string) {
  return [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];
}

export async function chatWithTutor(
  history: ChatMessage[],
  message: string,
  courseContext?: string
): Promise<string> {
  return generateContent(
    tutorContents(history, message),
    tutorSystemInstruction(courseContext)
  );
}

/**
 * Versão streaming do tutor: rende os pedaços de texto conforme o Gemini os
 * produz (endpoint streamGenerateContent com SSE). Erros ANTES do primeiro
 * pedaço lançam normalmente; depois disso o que já saiu fica valendo.
 */
export async function* chatWithTutorStream(
  history: ChatMessage[],
  message: string,
  courseContext?: string
): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor.");

  // Aborta se os CABEÇALHOS não chegarem logo; depois disso o stream corre
  // livre (um timeout no fetch inteiro mataria a resposta no meio).
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(
      `${GEMINI_API_URL}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: tutorContents(history, message),
          systemInstruction: {
            parts: [{ text: tutorSystemInstruction(courseContext) }],
          },
        }),
        signal: controle.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok || !res.body) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: eventos separados por linha em branco; cada um traz "data: {json}".
    const eventos = buffer.split("\n\n");
    buffer = eventos.pop() ?? "";
    for (const evento of eventos) {
      for (const linha of evento.split("\n")) {
        if (!linha.startsWith("data:")) continue;
        const payload = linha.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const data = JSON.parse(payload);
          const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof texto === "string" && texto) yield texto;
        } catch {
          // pedaço malformado: ignora e segue o fluxo
        }
      }
    }
  }
}

/**
 * "livre" transcreve palavra por palavra (diário).
 * "compromisso" normaliza horários e dias para facilitar a leitura posterior
 * por uma automação (notas de agenda).
 */
export type TranscriptionMode = "livre" | "compromisso";

const TRANSCRIPTION_PROMPTS: Record<TranscriptionMode, string> = {
  livre:
    "Transcreva o áudio a seguir em português do Brasil, palavra por palavra. Responda APENAS com o texto transcrito, sem comentários, sem markdown, sem aspas ao redor.",
  compromisso: [
    "Transcreva o áudio a seguir em português do Brasil. É uma anotação rápida sobre compromissos: reuniões, cursos, cultos, treinos, cancelamentos ou mudanças de horário.",
    "Escreva horários em formato numérico curto: 'quinze horas' vira '15h', 'oito e meia da noite' vira '20h30', 'meio-dia' vira '12h'.",
    "Mantenha os dias da semana e nomes de pessoas exatamente como falados.",
    "Não invente informação que não está no áudio e não tente completar o que ficou implícito.",
    "Responda APENAS com o texto transcrito, sem comentários, sem markdown, sem aspas ao redor.",
  ].join(" "),
};

export async function transcribeAudio(
  base64Audio: string,
  mimeType: string,
  mode: TranscriptionMode = "livre"
): Promise<string> {
  const systemInstruction = TRANSCRIPTION_PROMPTS[mode];

  const contents = [
    {
      role: "user",
      parts: [
        { text: "Transcreva este áudio:" },
        { inlineData: { mimeType, data: base64Audio } },
      ],
    },
  ];

  const raw = await generateContent(contents, systemInstruction);
  return raw.trim();
}

/**
 * Chamada em modo JSON: o Gemini é obrigado a responder JSON válido no formato
 * do `responseSchema` (subconjunto de OpenAPI). Quem chama ainda deve validar
 * os campos — o schema garante a forma, não o bom senso.
 */
export async function generateJson(
  prompt: string,
  systemInstruction: string,
  responseSchema: Record<string, unknown>
): Promise<unknown> {
  const raw = await generateContent(
    [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction,
    { responseMimeType: "application/json", responseSchema }
  );

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Gemini respondeu JSON inválido: ${raw.slice(0, 200)}`);
  }
}

export interface CourseProposal {
  title: string;
  description: string;
  category: string;
}

export async function proposeCourseFromChat(
  history: ChatMessage[],
  existingCategories: string[]
): Promise<CourseProposal> {
  const systemInstruction = [
    "Você analisa uma conversa entre um aluno e um tutor de IA e propõe um curso pra organizar o estudo desse assunto.",
    "Responda APENAS com um JSON válido, sem markdown, sem texto extra, no formato: " +
      '{"title": "...", "description": "...", "category": "..."}.',
    "O título deve ser curto e específico ao assunto discutido (não genérico tipo \"Curso de Programação\").",
    "A descrição deve ter 1-2 frases resumindo o que o curso cobre.",
    existingCategories.length > 0
      ? `Categorias já existentes: ${existingCategories.join(", ")}. Se o assunto se encaixar bem em uma delas, reutilize exatamente esse nome. Só proponha uma categoria nova se nenhuma existente fizer sentido.`
      : "Proponha uma categoria curta e genérica o suficiente pra agrupar cursos parecidos no futuro (ex: 'Tecnologia', 'Investimento', 'Arte').",
  ].join(" ");

  const conversationText = history
    .map((m) => `${m.role === "user" ? "Aluno" : "Tutor"}: ${m.text}`)
    .join("\n\n");

  const raw = await generateContent(
    [
      {
        role: "user",
        parts: [
          {
            text: `Baseado nesta conversa, proponha um curso:\n\n${conversationText}`,
          },
        ],
      },
    ],
    systemInstruction
  );

  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Não foi possível interpretar a proposta de curso gerada.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as CourseProposal).title !== "string" ||
    typeof (parsed as CourseProposal).description !== "string" ||
    typeof (parsed as CourseProposal).category !== "string"
  ) {
    throw new Error("Formato de proposta de curso inesperado.");
  }

  return parsed as CourseProposal;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export async function generateQuiz(
  lessonTitle: string,
  lessonContent: string,
  count = 4
): Promise<QuizQuestion[]> {
  const systemInstruction =
    "Você gera quizzes educacionais em português do Brasil. Responda APENAS com um JSON válido, sem markdown, sem texto extra, no formato: " +
    '[{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0}]. ' +
    "Cada pergunta deve ter exatamente 4 opções e correctIndex entre 0 e 3.";

  const prompt = `Gere ${count} perguntas de múltipla escolha sobre a lição "${lessonTitle}" com base neste conteúdo:\n\n${lessonContent}`;

  const raw = await generateContent(
    [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction
  );

  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Não foi possível interpretar o quiz gerado.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Formato de quiz inesperado.");
  }

  return parsed
    .filter(
      (q): q is QuizQuestion =>
        typeof q === "object" &&
        q !== null &&
        typeof (q as QuizQuestion).question === "string" &&
        Array.isArray((q as QuizQuestion).options) &&
        (q as QuizQuestion).options.length === 4 &&
        typeof (q as QuizQuestion).correctIndex === "number"
    )
    .slice(0, count);
}
