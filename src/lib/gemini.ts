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

export async function chatWithTutor(
  history: ChatMessage[],
  message: string,
  courseContext?: string
): Promise<string> {
  const systemInstruction = [
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

  const contents = [
    ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  return generateContent(contents, systemInstruction);
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
