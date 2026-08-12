const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

async function generateContent(
  contents: { role: string; parts: { text: string }[] }[],
  systemInstruction?: string
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
