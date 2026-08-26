"use client";

import { useEffect, useMemo, useState } from "react";
import type { Note, NoteStatus } from "@/lib/notes";

type Filter = "todas" | NoteStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todas", label: "todas" },
  { key: "pendente", label: "na fila" },
  { key: "processado", label: "despachadas" },
];

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(iso) === dayKey(today.toISOString())) return "hoje";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "ontem";
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sinceLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notas")
      .then((r) => r.json())
      .then((d) => setNotes(d.notes || []))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => (filter === "todas" ? notes : notes.filter((n) => n.status === filter)),
    [notes, filter]
  );

  const groups = useMemo(() => {
    const out: { label: string; items: Note[] }[] = [];
    for (const n of visible) {
      const label = dayLabel(n.createdAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(n);
      else out.push({ label, items: [n] });
    }
    return out;
  }, [visible]);

  const pendingCount = notes.filter((n) => n.status === "pendente").length;

  const lastRun = useMemo(() => {
    const stamps = notes
      .map((n) => n.processedAt)
      .filter((s): s is string => !!s)
      .sort();
    return stamps.length ? stamps[stamps.length - 1] : null;
  }, [notes]);

  async function save() {
    const value = text.trim();
    if (!value || saving) return;

    setSaving(true);
    setError(null);

    const res = await fetch("/api/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Não foi possível salvar a nota.");
      return;
    }

    const data = await res.json();
    setNotes((prev) => [data.note, ...prev]);
    setText("");
  }

  async function toggleStatus(note: Note) {
    const next: NoteStatus =
      note.status === "pendente" ? "processado" : "pendente";

    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id
          ? {
              ...n,
              status: next,
              processedAt:
                next === "processado" ? new Date().toISOString() : undefined,
            }
          : n
      )
    );

    await fetch(`/api/notas/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  async function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notas/${id}`, { method: "DELETE" });
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-6 py-10 text-[var(--color-foreground)] sm:px-10 sm:py-14">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-5 border-b border-[var(--color-border)] pb-8">
          <a
            href="/admin"
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)] hover:underline"
          >
            ← Painel · Notas
          </a>

          <h1 className="font-[family-name:var(--font-display)] text-[38px] font-semibold leading-[1.05] sm:text-[46px]">
            Notas
          </h1>

          <p className="max-w-xl text-[14px] leading-relaxed opacity-60">
            Compromissos com hora marcada, escritos como vierem à cabeça. Uma vez
            por dia a automação lê o que está na fila, cria os eventos no
            calendário e devolve a nota como despachada.
          </p>

          <StatusLine pendingCount={pendingCount} lastRun={lastRun} />
        </header>

        <Composer
          text={text}
          setText={setText}
          onSave={save}
          saving={saving}
          error={error}
        />

        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] transition-opacity ${
                  filter === f.key
                    ? "text-[var(--color-accent)] underline underline-offset-4"
                    : "opacity-40 hover:opacity-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="font-[family-name:var(--font-mono)] text-sm opacity-50">
              Carregando…
            </p>
          ) : groups.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="relative">
              {/* the rail every note hangs from */}
              <span
                className="absolute bottom-2 left-[7px] top-2 w-px bg-[var(--color-border)]"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-8">
                {groups.map((g) => (
                  <div key={g.label} className="flex flex-col gap-3">
                    <h2 className="pl-8 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em] opacity-40">
                      {g.label}
                    </h2>
                    {g.items.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        onToggle={() => toggleStatus(note)}
                        onRemove={() => remove(note.id)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusLine({
  pendingCount,
  lastRun,
}: {
  pendingCount: number;
  lastRun: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-[family-name:var(--font-mono)] text-[12px]">
      <span
        className={`inline-flex items-center gap-2 ${
          pendingCount > 0 ? "text-[var(--color-accent)]" : "opacity-55"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            pendingCount > 0
              ? "bg-[var(--color-accent)]"
              : "bg-[var(--color-border)]"
          }`}
          aria-hidden="true"
        />
        {pendingCount === 0
          ? "fila vazia"
          : `${pendingCount} na fila`}
      </span>
      <span className="opacity-25">/</span>
      <span className="opacity-55">
        {lastRun
          ? `automação passou ${sinceLabel(lastRun)}`
          : "automação ainda não passou"}
      </span>
    </div>
  );
}

function Composer({
  text,
  setText,
  onSave,
  saving,
  error,
}: {
  text: string;
  setText: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-[var(--color-accent)]/35 bg-[var(--color-surface)] p-6 sm:p-7">
      <label
        htmlFor="nota"
        className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em] opacity-45"
      >
        Nova nota
      </label>
      <textarea
        id="nota"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave();
        }}
        rows={3}
        placeholder="reunião quinta 15h com fulano&#10;cancelar treino de hoje&#10;mudar culto de quarta pra 20h"
        className="w-full resize-y bg-transparent text-[15px] leading-relaxed outline-none placeholder:opacity-35"
      />
      {error && <p className="text-[13px] text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
        <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-35">
          ctrl + enter salva
        </span>
        <button
          onClick={onSave}
          disabled={!text.trim() || saving}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--color-background)] transition-opacity disabled:opacity-25"
        >
          {saving ? "salvando…" : "pôr na fila"}
        </button>
      </div>
    </section>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const copy =
    filter === "pendente"
      ? "Nada na fila. Tudo que você escreveu já virou evento."
      : filter === "processado"
        ? "Nenhuma nota despachada ainda."
        : "Nenhuma nota ainda. Escreva a primeira acima.";

  return <p className="pl-8 text-[14px] opacity-45">{copy}</p>;
}

function NoteRow({
  note,
  onToggle,
  onRemove,
}: {
  note: Note;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const done = note.status === "processado";

  const action =
    "font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-40 transition-opacity hover:underline hover:opacity-100 focus-visible:opacity-100";

  return (
    <article className="group relative pl-8">
      {/* node on the rail: filled while queued, hollow once dispatched */}
      <span
        className={`absolute left-0 top-[7px] h-[15px] w-[15px] rounded-full border-2 bg-[var(--color-background)] ${
          done
            ? "border-[var(--color-border)]"
            : "border-[var(--color-accent)] shadow-[inset_0_0_0_3px_var(--color-accent)]"
        }`}
        aria-hidden="true"
      />

      <div
        className={`flex flex-col gap-2.5 rounded-[12px] border bg-[var(--color-surface)] p-4 transition-colors sm:p-5 ${
          done ? "border-[var(--color-border)]" : "border-[var(--color-accent)]/30"
        }`}
      >
        <p
          className={`whitespace-pre-wrap text-[15px] leading-relaxed ${
            done ? "opacity-50" : ""
          }`}
        >
          {note.text}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-40">
            {timeLabel(note.createdAt)}
          </span>
          {done && note.processedAt && (
            <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-40">
              despachada {sinceLabel(note.processedAt)}
            </span>
          )}

          <div className="ml-auto flex items-center gap-4">
            {confirming ? (
              <>
                <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-60">
                  excluir?
                </span>
                <button
                  onClick={onRemove}
                  className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider text-[var(--color-accent)] underline"
                  aria-label={`Confirmar exclusão da nota`}
                >
                  excluir
                </button>
                <button onClick={() => setConfirming(false)} className={action}>
                  cancelar
                </button>
              </>
            ) : (
              <>
                <button onClick={onToggle} className={action}>
                  {done ? "voltar pra fila" : "marcar despachada"}
                </button>
                <button onClick={() => setConfirming(true)} className={action}>
                  excluir
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
