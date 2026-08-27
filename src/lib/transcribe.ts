import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio, type TranscriptionMode } from "@/lib/gemini";

const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

const MAX_SIZE = 15 * 1024 * 1024;

/**
 * Reads an audio file from the request's FormData and returns its
 * transcription. Callers are responsible for authenticating the request first.
 */
export async function handleTranscription(
  req: NextRequest,
  mode: TranscriptionMode
): Promise<NextResponse> {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum áudio enviado." }, { status: 400 });
  }

  // MediaRecorder reports things like "audio/webm;codecs=opus".
  const baseMimeType = file.type.split(";")[0].trim();

  if (!ALLOWED_TYPES.has(baseMimeType)) {
    return NextResponse.json(
      { error: `Formato de áudio não suportado: ${file.type}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Áudio muito grande. Máximo de 15MB." },
      { status: 400 }
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const text = await transcribeAudio(bytes.toString("base64"), baseMimeType, mode);
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível transcrever o áudio agora. Tente novamente." },
      { status: 502 }
    );
  }
}
