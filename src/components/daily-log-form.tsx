"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TAG_REGEX = /,?\s*tag[s]?\s+([a-zà-úA-ZÀ-Ú0-9-]+)\.?/gi;
const SUBMIT_REGEX = /,?\s*registrar\s+(o\s+)?log\.?/gi;
const SUBMIT_TEST_REGEX = /registrar\s+(o\s+)?log\.?/i;

function parseTranscription(raw: string) {
  let text = raw;
  const tags: string[] = [];

  text = text.replace(TAG_REGEX, (_match, words: string) => {
    tags.push(
      words
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
    );
    return " ";
  });

  const autoSubmit = SUBMIT_TEST_REGEX.test(text);
  text = text.replace(SUBMIT_REGEX, " ");

  text = text.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();

  return { text, tags, autoSubmit };
}

export function DailyLogForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textRef = useRef(text);
  const tagsInputRef = useRef(tagsInput);
  textRef.current = text;
  tagsInputRef.current = tagsInput;

  async function submitEntry(finalText: string, finalTagsInput: string) {
    if (!finalText.trim() || saving) return;
    setSaving(true);
    setError(null);

    const tags = finalTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await fetch("/api/log-do-dia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: finalText.trim(), tags }),
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

  async function handleRecordClick() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    setError(null);
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

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setTranscribing(true);
        setError(null);

        const form = new FormData();
        form.append("file", blob, "audio.webm");

        const res = await fetch("/api/log-do-dia/transcribe", {
          method: "POST",
          body: form,
        });

        setTranscribing(false);

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Erro ao transcrever áudio.");
          return;
        }

        const data = await res.json();
        const { text: parsedText, tags: extractedTags, autoSubmit } = parseTranscription(
          data.text
        );

        const mergedText = textRef.current.trim()
          ? `${textRef.current.trim()}\n${parsedText}`
          : parsedText;

        const existingTags = tagsInputRef.current
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const mergedTagsInput = Array.from(new Set([...existingTags, ...extractedTags])).join(
          ", "
        );

        setText(mergedText);
        setTagsInput(mergedTagsInput);

        if (autoSubmit) {
          submitEntry(mergedText, mergedTagsInput);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Não foi possível acessar o microfone.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitEntry(text, tagsInput);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[14px] border border-[var(--color-accent)]/35 bg-[var(--color-surface)] p-6 sm:p-7"
    >
      <label
        htmlFor="registro"
        className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em] opacity-45"
      >
        Novo registro
      </label>

      <textarea
        id="registro"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Como foi o dia?"
        rows={4}
        className="w-full resize-y bg-transparent text-[15px] leading-relaxed outline-none placeholder:opacity-35"
      />

      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="tags separadas por vírgula — treino, sem-acucar, bom-sono"
        className="w-full border-t border-[var(--color-border)] bg-transparent pt-3 text-[13.5px] outline-none placeholder:opacity-35"
      />

      {error && <p className="text-[13px] text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
        <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wider opacity-35">
          {recording
            ? "gravando… diga “tag treino” ou “registrar log”"
            : transcribing
              ? "transcrevendo o áudio…"
              : "ditando, “tag x” vira tag"}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRecordClick}
            disabled={transcribing}
            aria-label={recording ? "Parar gravação" : "Ditar registro por áudio"}
            className={`rounded-md border px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-30 ${
              recording
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-background)]"
                : "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            }`}
          >
            {recording ? "■ parar" : transcribing ? "…" : "● ditar"}
          </button>
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--color-background)] transition-opacity disabled:opacity-25"
          >
            {saving ? "salvando…" : "registrar"}
          </button>
        </div>
      </div>
    </form>
  );
}
