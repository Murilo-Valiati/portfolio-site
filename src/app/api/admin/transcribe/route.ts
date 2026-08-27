import { NextRequest } from "next/server";
import { handleTranscription } from "@/lib/transcribe";
import type { TranscriptionMode } from "@/lib/gemini";

const VALID_MODES: TranscriptionMode[] = ["livre", "compromisso"];

/**
 * Transcribes recorded audio. Sits under /api/admin so the existing middleware
 * already requires a valid session — no manual check needed here.
 */
export async function POST(req: NextRequest) {
  const modeParam = req.nextUrl.searchParams.get("mode");
  const mode: TranscriptionMode = VALID_MODES.includes(modeParam as TranscriptionMode)
    ? (modeParam as TranscriptionMode)
    : "livre";

  return handleTranscription(req, mode);
}
