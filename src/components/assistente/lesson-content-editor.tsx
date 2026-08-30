"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Editor do texto de uma lição personalizada. Preencher o conteúdo destrava o
 * quiz — antes, lição criada por você ficava vazia pra sempre.
 */
export function LessonContentEditor({
  courseId,
  lessonId,
  initialContent,
}: {
  courseId: string;
  lessonId: string;
  initialContent: string;
}) {
  const router = useRouter();
  const temConteudo = initialContent.trim().length > 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function salvar() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/assistente/lessons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId, content: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(initialContent);
          setEditing(true);
        }}
        className="self-start text-sm text-[var(--color-accent)] hover:underline"
      >
        {temConteudo ? "Editar conteúdo da lição" : "✍️ Escrever o conteúdo desta lição"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-5">
      <label className="text-sm font-medium" htmlFor="conteudo-licao">
        Conteúdo da lição
      </label>
      <textarea
        id="conteudo-licao"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={10}
        placeholder="Escreva (ou cole) o material desta lição. Com conteúdo, o quiz por IA fica disponível."
        className="w-full resize-y rounded-md border border-[var(--color-border)] bg-transparent p-3 text-[15px] leading-relaxed outline-none focus:border-[var(--color-accent)]"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={saving}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--rich-black)] transition disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar conteúdo"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm opacity-60 hover:opacity-100"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
