function proficiencyLabel(level: number): string {
  if (level >= 95) return "Fluente";
  if (level >= 70) return "Avançado";
  if (level >= 40) return "Intermediário";
  return "Básico";
}

export function LanguageBar({ name, level }: { name: string; level: number }) {
  const clamped = Math.min(100, Math.max(0, level));

  return (
    <div>
      <div className="mb-2.5 text-sm font-medium">{name}</div>
      <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="absolute inset-0 rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            background:
              "linear-gradient(90deg, var(--color-accent), var(--color-accent-strong))",
          }}
        />
      </div>
      <div
        className="mt-2 flex justify-between text-[11px] text-[var(--color-muted)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <span>{proficiencyLabel(clamped)}</span>
        <span>{clamped}/100</span>
      </div>
    </div>
  );
}
