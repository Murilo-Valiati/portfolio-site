"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "inherit",
  fontSize: 14,
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: 6,
  boxSizing: "border-box",
};

export function DailyLogForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await fetch("/api/log-do-dia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), tags }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erro ao salvar.");
      return;
    }

    setText("");
    setTagsInput("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Como foi o dia? Treino, estudo, alimentação, sono, humor, tela..."
        rows={5}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags separadas por vírgula (ex: treino, sem-acucar, bom-sono)"
        style={inputStyle}
      />
      {error && <p style={{ fontSize: 13, color: "#c00", margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={saving || !text.trim()}
        style={{
          alignSelf: "flex-start",
          fontSize: 14,
          fontWeight: 600,
          padding: "8px 16px",
          border: "none",
          borderRadius: 6,
          background: saving ? "#999" : "#111",
          color: "#fff",
          cursor: saving ? "default" : "pointer",
        }}
      >
        {saving ? "Salvando..." : "Registrar"}
      </button>
    </form>
  );
}
