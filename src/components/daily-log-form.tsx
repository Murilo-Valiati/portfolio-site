"use client";

import { useRef, useState } from "react";
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
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="submit"
          disabled={saving || !text.trim()}
          style={{
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
        <button
          type="button"
          onClick={handleRecordClick}
          disabled={transcribing}
          style={{
            fontSize: 14,
            fontWeight: 600,
            padding: "8px 16px",
            border: "1px solid #ccc",
            borderRadius: 6,
            background: recording ? "#c00" : "#fff",
            color: recording ? "#fff" : "#111",
            cursor: transcribing ? "default" : "pointer",
          }}
        >
          {recording ? "⏹ Parar" : transcribing ? "Transcrevendo..." : "🎙 Gravar áudio"}
        </button>
      </div>
    </form>
  );
}
