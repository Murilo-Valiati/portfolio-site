import { spawn } from "child_process";
import type { ChatMessage } from "@/lib/gemini";
import { tutorSystemInstruction } from "@/lib/gemini";
import {
  montarPromptNota,
  SISTEMA_INTERPRETADOR,
  validarItens,
  type Interpretacao,
} from "@/lib/interprete";
import type { Note } from "@/lib/notes";

/**
 * Motor do ASSISTENTE usando a assinatura pessoal do Claude, via Claude Code
 * em modo headless (`claude -p`). Decisão do dono (30/08): só a aba
 * Assistente usa isto — a agenda continua no Gemini.
 *
 * - Ativa quando CLAUDE_CODE_OAUTH_TOKEN existe no ambiente (gerado com
 *   `claude setup-token`) ou CLAUDE_ASSISTENTE=1 (dev local já autenticado).
 * - O prompt vai por STDIN (nunca por argumento de shell) e nenhum conteúdo
 *   do usuário entra na linha de comando.
 * - Toda rota que usa isto mantém fallback pro Gemini: assinatura no limite
 *   ou CLI indisponível nunca derrubam o Assistente.
 * - Uso pessoal: se o site um dia servir terceiros, este motor deve migrar
 *   pra Claude API.
 */

const MODELO = process.env.CLAUDE_MODELO || "sonnet";
const TEMPO_LIMITE_MS = 120_000;
/** Caminho do binário; sobrescreva com CLAUDE_BIN quando fora do PATH. */
const BIN = process.env.CLAUDE_BIN || "claude";

export function claudeConfigurado(): boolean {
  return Boolean(
    process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.CLAUDE_ASSISTENTE
  );
}

function rodarClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      BIN,
      ["-p", "--model", MODELO, "--output-format", "text"],
      {
        // No Windows (dev) o binário global é claude.cmd, que exige shell.
        shell: process.platform === "win32",
        env: process.env,
      }
    );

    let saida = "";
    let erro = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("Claude (assinatura) excedeu o tempo limite."));
    }, TEMPO_LIMITE_MS);

    proc.stdout.on("data", (d) => (saida += d));
    proc.stderr.on("data", (d) => (erro += d));
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const detalhe = (erro.trim() || saida.trim()).slice(0, 200);
        return reject(new Error(`claude saiu com código ${code}: ${detalhe}`));
      }
      const texto = saida.trim();
      if (!texto) return reject(new Error("Claude respondeu vazio."));
      resolve(texto);
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

function limparJson(bruto: string): string {
  return bruto
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
}

export async function tutorClaude(
  history: ChatMessage[],
  message: string,
  courseContext?: string
): Promise<string> {
  const prompt = [
    tutorSystemInstruction(courseContext),
    "",
    history.length > 0 ? "=== Conversa até aqui ===" : "",
    ...history.map(
      (m) => `${m.role === "user" ? "Aluno" : "Tutor"}: ${m.text}`
    ),
    "",
    "=== Nova pergunta do aluno ===",
    message,
    "",
    "Responda como o tutor, falando diretamente com o aluno, em markdown. Responda APENAS com a resposta do tutor.",
  ]
    .filter((l) => l !== "")
    .join("\n");

  return rodarClaude(prompt);
}

/** Interpretação de nota da agenda pela assinatura (mesmas regras do Gemini). */
export async function interpretarNotaClaude(nota: Note): Promise<Interpretacao[]> {
  const prompt = [
    SISTEMA_INTERPRETADOR,
    "",
    montarPromptNota(nota),
    "",
    'Responda APENAS com o JSON {"itens": [...]}, sem markdown e sem texto extra.',
  ].join("\n");

  const bruto = JSON.parse(limparJson(await rodarClaude(prompt)));
  return validarItens(bruto);
}

export interface QuizQuestionClaude {
  question: string;
  options: string[];
  correctIndex: number;
}

export async function gerarQuizClaude(
  lessonTitle: string,
  lessonContent: string,
  count = 4
): Promise<QuizQuestionClaude[]> {
  const prompt = [
    "Você gera quizzes educacionais em português do Brasil.",
    "Responda APENAS com um JSON válido, sem markdown e sem texto extra, no formato:",
    '[{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0}]',
    "Cada pergunta deve ter exatamente 4 opções e correctIndex entre 0 e 3.",
    "",
    `Gere ${count} perguntas de múltipla escolha sobre a lição "${lessonTitle}" com base neste conteúdo:`,
    "",
    lessonContent,
  ].join("\n");

  const parsed: unknown = JSON.parse(limparJson(await rodarClaude(prompt)));
  if (!Array.isArray(parsed)) throw new Error("Formato de quiz inesperado.");

  const questions = parsed
    .filter(
      (q): q is QuizQuestionClaude =>
        typeof q === "object" &&
        q !== null &&
        typeof (q as QuizQuestionClaude).question === "string" &&
        Array.isArray((q as QuizQuestionClaude).options) &&
        (q as QuizQuestionClaude).options.length === 4 &&
        typeof (q as QuizQuestionClaude).correctIndex === "number"
    )
    .slice(0, count);

  if (questions.length === 0) throw new Error("Nenhuma pergunta gerada.");
  return questions;
}

export interface PropostaCursoClaude {
  title: string;
  description: string;
  category: string;
}

export async function proporCursoClaude(
  history: ChatMessage[],
  existingCategories: string[]
): Promise<PropostaCursoClaude> {
  const conversa = history
    .map((m) => `${m.role === "user" ? "Aluno" : "Tutor"}: ${m.text}`)
    .join("\n\n");

  const prompt = [
    "Você analisa uma conversa entre um aluno e um tutor de IA e propõe um curso pra organizar o estudo desse assunto.",
    'Responda APENAS com um JSON válido, sem markdown e sem texto extra, no formato: {"title": "...", "description": "...", "category": "..."}.',
    "O título deve ser curto e específico ao assunto discutido. A descrição deve ter 1-2 frases.",
    existingCategories.length > 0
      ? `Categorias já existentes: ${existingCategories.join(", ")}. Reutilize uma delas se o assunto se encaixar; só proponha nova se nenhuma servir.`
      : "Proponha uma categoria curta e genérica o suficiente pra agrupar cursos parecidos.",
    "",
    "Conversa:",
    conversa,
  ].join("\n");

  const parsed = JSON.parse(limparJson(await rodarClaude(prompt))) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as PropostaCursoClaude).title !== "string" ||
    typeof (parsed as PropostaCursoClaude).description !== "string" ||
    typeof (parsed as PropostaCursoClaude).category !== "string"
  ) {
    throw new Error("Formato de proposta de curso inesperado.");
  }
  return parsed as PropostaCursoClaude;
}
