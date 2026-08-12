"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ...props }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props} />
  ),
  li: ({ node, ...props }) => <li {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
  code: ({ node, ...props }) => (
    <code
      className="rounded bg-[var(--color-background)] px-1 py-0.5 text-[0.85em]"
      style={{ fontFamily: "var(--font-mono)" }}
      {...props}
    />
  ),
  a: ({ node, ...props }) => (
    <a
      className="underline underline-offset-2 hover:text-[var(--color-accent)]"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
};

interface Message {
  role: "user" | "model";
  text: string;
}

export function ChatWidget({
  courseContext,
  threadKey = "geral",
}: {
  courseContext?: string;
  threadKey?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingCourse, setCreatingCourse] = useState(false);

  async function handleCreateCourse() {
    if (creatingCourse || messages.length === 0) return;
    setCreatingCourse(true);
    setError(null);
    try {
      const res = await fetch("/api/assistente/courses/from-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar curso.");
      router.push(`/assistente/cursos/${data.course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar curso.");
      setCreatingCourse(false);
    }
  }

  useEffect(() => {
    setHistoryLoading(true);
    fetch(`/api/assistente/chat?threadKey=${encodeURIComponent(threadKey)}`)
      .then((res) => res.json())
      .then((data) => setMessages(Array.isArray(data.history) ? data.history : []))
      .finally(() => setHistoryLoading(false));
  }, [threadKey]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    const history = messages;
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistente/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, courseContext, threadKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao responder.");
      setMessages((m) => [...m, { role: "model", text: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao responder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tutor de IA</h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleCreateCourse}
            disabled={creatingCourse}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            {creatingCourse ? "Criando curso..." : "Criar curso a partir desta conversa"}
          </button>
        )}
      </div>

      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {!historyLoading && messages.length === 0 && (
          <p className="text-sm opacity-60">
            Pergunte algo sobre esta lição ou peça um exemplo.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
              m.role === "user"
                ? "self-end whitespace-pre-wrap bg-[var(--color-accent)] text-[var(--rich-black)]"
                : "self-start border border-[var(--color-border)]"
            }`}
          >
            {m.role === "model" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {m.text}
              </ReactMarkdown>
            ) : (
              m.text
            )}
          </div>
        ))}
        {loading && (
          <div className="self-start text-sm opacity-60">Pensando...</div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua pergunta..."
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--rich-black)] transition disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </section>
  );
}
