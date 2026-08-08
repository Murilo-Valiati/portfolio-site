export function LanguageBar({ name, level }: { name: string; level: number }) {
  const clamped = Math.min(100, Math.max(0, level));
  const isMax = clamped >= 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{name}</span>
      </div>
      <div className="relative h-7 overflow-hidden rounded-sm border border-[var(--color-foreground)]">
        <div
          className="h-full bg-[var(--color-accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold tracking-wide text-[var(--color-foreground)] uppercase">
          {isMax ? "Max" : "Exp"}
        </span>
      </div>
      <span className="self-end text-xs opacity-70">
        Lvl <span className="font-bold opacity-100">{clamped}</span>/100
      </span>
    </div>
  );
}
