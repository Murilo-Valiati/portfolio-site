"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEW_CATEGORY = "__nova__";

export function CreateCourseForm({
  existingCategories,
}: {
  existingCategories: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(existingCategories[0] ?? NEW_CATEGORY);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const finalCategory =
      category === NEW_CATEGORY ? newCategory.trim() : category;
    if (!title.trim() || !finalCategory || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/assistente/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Erro ao criar curso.");
      return;
    }
    router.push(`/assistente/cursos/${data.course.id}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-[10px] border border-dashed border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-accent)] transition hover:border-[var(--color-accent)]"
      >
        + Criar curso
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-[26px_28px]">
      <h2 className="font-[family-name:var(--font-display)] text-[19px] font-semibold">
        Criar curso
      </h2>

      <label className="flex flex-col gap-1 text-sm">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Investimentos para iniciantes"
          className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Descrição
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Do que se trata esse curso"
          className="min-h-20 rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Categoria
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        >
          {existingCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
          <option value={NEW_CATEGORY}>+ Nova categoria</option>
        </select>
      </label>

      {category === NEW_CATEGORY && (
        <label className="flex flex-col gap-1 text-sm">
          Nome da nova categoria
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Ex: Investimento"
            className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </label>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm text-[var(--rich-black)] disabled:opacity-50"
        >
          {saving ? "Criando..." : "Criar curso"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}
