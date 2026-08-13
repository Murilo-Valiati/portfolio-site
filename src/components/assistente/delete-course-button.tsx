"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Remover este curso apaga também seus módulos, lições, progresso e histórico de chat. Essa ação não pode ser desfeita. Continuar?"
    );
    if (!confirmed) return;

    setDeleting(true);
    const res = await fetch("/api/assistente/courses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    if (res.ok) {
      router.push("/assistente");
      router.refresh();
    } else {
      setDeleting(false);
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Erro ao remover curso.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm text-red-400 transition hover:underline disabled:opacity-50"
    >
      {deleting ? "Removendo..." : "Remover curso"}
    </button>
  );
}
