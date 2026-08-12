"use client";

import { useState, useTransition } from "react";

export function LessonProgressToggle({
  courseId,
  lessonId,
  initialDone,
}: {
  courseId: string;
  lessonId: string;
  initialDone: boolean;
}) {
  const [done, setDone] = useState(initialDone);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !done;
    setDone(next);
    startTransition(async () => {
      try {
        const res = await fetch("/api/assistente/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, lessonId, completed: next }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setDone(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition disabled:opacity-60 ${
        done
          ? "border-[var(--color-accent)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      }`}
    >
      {done ? "✓ Concluída" : "Marcar como concluída"}
    </button>
  );
}
