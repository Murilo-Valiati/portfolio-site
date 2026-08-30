"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Note, NoteStatus } from "@/lib/notes";

type Filter = "todas" | "pendente" | "processado" | "atencao";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todas", label: "todas" },
  { key: "pendente", label: "na fila" },
  { key: "processado", label: "despachadas" },
  { key: "atencao", label: "atenção" },
];

const PRECISA_DE_VOCE: NoteStatus[] = ["aguardando", "erro"];

/** "22/09 09:00" (ou só "22/09" para evento de dia inteiro), fuso de SP. */
function eventoLabel(inicio: string, diaInteiro: boolean): string {
  const d = diaInteiro
    ? new Date(`${inicio}T12:00:00-03:00`)
    : new Date(inicio);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    ...(diaInteiro ? {} : { hour: "2-digit", minute: "2-digit" }),
  });
}

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
    function load() {
      return fetch("/api/notas", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setNotes(d.notes || []))
        .finally(() => setLoading(false));
    }

    load();

    // A página costuma ficar aberta no celular. Sem isto, ela mostraria o
    // estado de quando foi aberta, mesmo depois da automação mexer na fila.
    function onFocus() {
      if (document.visibilityState === "visible") load();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const visible = useMemo(() => {
    if (filter === "todas") return notes;
    if (filter === "atencao")
      return notes.filter((n) => PRECISA_DE_VOCE.includes(n.status));
    return notes.filter((n) => n.status === filter);
  }, [notes, filter]);

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
  const attentionCount = notes.filter((n) =>
    PRECISA_DE_VOCE.includes(n.status)
  ).length;

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
    // pendente -> despachada à mão; qualquer outro estado -> volta pra fila
    // (que também é o "tentar de novo" de aguardando/erro).
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

  async function editText(note: Note, value: string) {
    const res = await fetch(`/api/notas/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === note.id ? data.note : n)));
    }
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
            Compromissos escritos como vierem à cabeça. O site interpreta a nota
            na hora, cria o evento no Google Agenda e, se você pedir
            &ldquo;me ligue&rdquo;, telefona 15 minutos antes. O que precisar de
            você fica em <em>atenção</em>.
          </p>

          <StatusLine
            pendingCount={pendingCount}
            attentionCount={attentionCount}
            lastRun={lastRun}
          />
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
                        onEditText={(value) => editText(note, value)}
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
  attentionCount,
  lastRun,
}: {
  pendingCount: number;
  attentionCount: number;
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
      {attentionCount > 0 && (
        <>
          <span className="opacity-25">/</span>
          <span className="inline-flex items-center gap-2 text-amber-500">
            <span
              className="h-1.5 w-1.5 rounded-full bg-amber-500"
              aria-hidden="true"
            />
            {attentionCount === 1
              ? "1 precisa de você"
              : `${attentionCount} precisam de você`}
          </span>
        </>
      )}
      <span className="opacity-25">/</span>
      <span className="opacity-55">
        {lastRun
          ? `última despachada ${sinceLabel(lastRun)}`
          : "nenhuma despachada ainda"}
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
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textRef = useRef(text);
  textRef.current = text;

  async function handleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setTranscribing(true);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const form = new FormData();
        form.append("file", blob, "nota.webm");

        const res = await fetch("/api/admin/transcribe?mode=compromisso", {
          method: "POST",
          body: form,
        });

        setTranscribing(false);

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMicError(data.error || "Erro ao transcrever o áudio.");
          return;
        }

        const data = await res.json();
        const prev = textRef.current.trim();
        setText(prev ? `${prev}\n${data.text}` : data.text);
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setMicError("Não foi possível acessar o microfone.");
    }
  }

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
      {(error || micError) && (
        <p className="text-[13px] text-red-400">{error || micError}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
        <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-35">
          {recording
            ? "gravando… toque em parar quando terminar"
            : transcribing
              ? "transcrevendo o áudio…"
              : "ctrl + enter salva"}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecord}
            disabled={transcribing}
            aria-label={recording ? "Parar gravação" : "Ditar nota por áudio"}
            className={`rounded-md border px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-30 ${
              recording
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-background)]"
                : "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            }`}
          >
            {recording ? "■ parar" : transcribing ? "…" : "● ditar"}
          </button>
          <button
            onClick={onSave}
            disabled={!text.trim() || saving}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--color-background)] transition-opacity disabled:opacity-25"
          >
            {saving ? "salvando…" : "pôr na fila"}
          </button>
        </div>
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
        : filter === "atencao"
          ? "Nada esperando você. Tudo fluindo."
          : "Nenhuma nota ainda. Escreva a primeira acima.";

  return <p className="pl-8 text-[14px] opacity-45">{copy}</p>;
}

function NoteRow({
  note,
  onToggle,
  onRemove,
  onEditText,
}: {
  note: Note;
  onToggle: () => void;
  onRemove: () => void;
  onEditText: (value: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const done = note.status === "processado";
  const attention = note.status === "aguardando" || note.status === "erro";

  function saveEdit() {
    const value = draft.trim();
    if (!value) return;
    setEditing(false);
    onEditText(value);
  }

  const action =
    "font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-40 transition-opacity hover:underline hover:opacity-100 focus-visible:opacity-100";

  return (
    <article className="group relative pl-8">
      {/* node on the rail: filled while queued, hollow once dispatched,
          amber when the note needs the owner */}
      <span
        className={`absolute left-0 top-[7px] h-[15px] w-[15px] rounded-full border-2 bg-[var(--color-background)] ${
          done
            ? "border-[var(--color-border)]"
            : attention
              ? "border-amber-500 shadow-[inset_0_0_0_3px_#f59e0b]"
              : "border-[var(--color-accent)] shadow-[inset_0_0_0_3px_var(--color-accent)]"
        }`}
        aria-hidden="true"
      />

      <div
        className={`flex flex-col gap-2.5 rounded-[12px] border bg-[var(--color-surface)] p-4 transition-colors sm:p-5 ${
          done
            ? "border-[var(--color-border)]"
            : attention
              ? "border-amber-500/40"
              : "border-[var(--color-accent)]/30"
        }`}
      >
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              rows={2}
              autoFocus
              className="w-full resize-y rounded-[8px] border border-[var(--color-accent)]/40 bg-transparent p-2 text-[15px] leading-relaxed outline-none"
            />
            <div className="flex gap-4">
              <button
                onClick={saveEdit}
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider text-[var(--color-accent)] underline"
              >
                salvar e reprocessar
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraft(note.text);
                }}
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-40 hover:opacity-100"
              >
                cancelar
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`whitespace-pre-wrap text-[15px] leading-relaxed ${
              done ? "opacity-50" : ""
            }`}
          >
            {note.text}
          </p>
        )}

        {attention && note.aviso && !editing && (
          <p className="text-[13px] leading-relaxed text-amber-500">
            {note.status === "erro" ? "⚠ " : ""}
            {note.aviso}
          </p>
        )}

        {done && note.evento && (
          <p className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-accent)] opacity-80">
            ✓ {note.evento.titulo} ·{" "}
            {eventoLabel(note.evento.inicio, note.evento.diaInteiro)}
          </p>
        )}

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
                {attention && !editing && (
                  <button
                    onClick={() => {
                      setDraft(note.text);
                      setEditing(true);
                    }}
                    className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider text-[var(--color-accent)] transition-opacity hover:underline"
                  >
                    corrigir
                  </button>
                )}
                <button onClick={onToggle} className={action}>
                  {done
                    ? "voltar pra fila"
                    : attention
                      ? "tentar de novo"
                      : "marcar despachada"}
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
