"use client";

import { useState } from "react";

interface Message {
  role: "user" | "model";
  text: string;
}

export function ChatWidget({ courseContext }: { courseContext?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ message: text, history, courseContext }),
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
      <h2 className="text-lg font-semibold">Tutor de IA</h2>

      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm opacity-60">
            Pergunte algo sobre esta lição ou peça um exemplo.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "self-end bg-[var(--color-accent)] text-[var(--rich-black)]"
                : "self-start border border-[var(--color-border)]"
            }`}
          >
            {m.text}
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
