"use client";

import { useState } from "react";

export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={`text-[14.5px] leading-[1.65] opacity-[.82] ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {text}
      </p>
      {text.length > 160 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-[var(--color-accent)] hover:underline"
        >
          {expanded ? "Mostrar menos" : "Mostrar mais"}
        </button>
      )}
    </div>
  );
}
