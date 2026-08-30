"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RestoreCoursesButton({ quantos }: { quantos: number }) {
  const router = useRouter();
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    setRestoring(true);
    await fetch("/api/assistente/courses/restaurar", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRestore}
      disabled={restoring}
      className="self-start text-sm opacity-50 transition hover:text-[var(--color-accent)] hover:underline hover:opacity-100 disabled:opacity-30"
    >
      {restoring
        ? "Restaurando…"
        : `Restaurar ${quantos} curso${quantos > 1 ? "s" : ""} padrão oculto${quantos > 1 ? "s" : ""}`}
    </button>
  );
}
