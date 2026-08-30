"use client";

import { useState } from "react";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface UltimoResultado {
  score: number;
  total: number;
  date: string;
}

export function QuizPanel({
  courseId,
  lessonId,
  ultimoInicial,
}: {
  courseId: string;
  lessonId: string;
  ultimoInicial?: UltimoResultado | null;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [ultimo, setUltimo] = useState<UltimoResultado | null>(ultimoInicial ?? null);

  // Registra o desempenho: sem memória, o quiz é brincadeira, não estudo.
  function corrigir() {
    if (!questions) return;
    setSubmitted(true);
    const acertos = questions.reduce(
      (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
      0
    );
    const erradas = questions
      .filter((q, i) => answers[i] !== q.correctIndex)
      .map((q) => q.question);
    const registro = {
      score: acertos,
      total: questions.length,
      date: new Date().toISOString(),
    };
    setUltimo(registro);
    fetch("/api/assistente/quiz/resultados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, lessonId, ...registro, erradas }),
    }).catch(() => {});
  }

  const generate = async () => {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    setAnswers({});
    try {
      const res = await fetch("/api/assistente/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar quiz.");
      setQuestions(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar quiz.");
    } finally {
      setLoading(false);
    }
  };

  const score = questions
    ? questions.reduce(
        (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
        0
      )
    : 0;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-semibold">Quiz gerado por IA</h2>
          {ultimo && (
            <span
              className="text-[11.5px] text-[var(--color-muted)]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              último: {ultimo.score}/{ultimo.total} ·{" "}
              {new Date(ultimo.date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-60"
        >
          {loading ? "Gerando..." : questions ? "Gerar novo quiz" : "Gerar quiz"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {questions && (
        <div className="flex flex-col gap-5">
          {questions.map((q, qi) => (
            <div key={qi} className="flex flex-col gap-2">
              <p className="font-medium">
                {qi + 1}. {q.question}
              </p>
              <div className="flex flex-col gap-1.5">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  const showResult = submitted;
                  const isCorrect = oi === q.correctIndex;
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={submitted}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [qi]: oi }))
                      }
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                        showResult && isCorrect
                          ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                          : showResult && selected && !isCorrect
                            ? "border-red-400 text-red-500"
                            : selected
                              ? "border-[var(--color-accent)]"
                              : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!submitted ? (
            <button
              type="button"
              onClick={corrigir}
              disabled={Object.keys(answers).length < questions.length}
              className="self-start rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--rich-black)] transition disabled:opacity-50"
            >
              Corrigir
            </button>
          ) : (
            <p className="text-sm opacity-80">
              Você acertou {score} de {questions.length}. Resultado registrado.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
