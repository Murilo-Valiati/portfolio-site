import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { transcribeAudio } from "@/lib/gemini";

const ALLOWED_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

const MAX_SIZE = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const valid = token ? await verifySessionToken(token) : false;
  if (!valid) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum áudio enviado." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
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
    const base64 = bytes.toString("base64");
    const text = await transcribeAudio(base64, file.type);
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível transcrever o áudio agora. Tente novamente." },
      { status: 502 }
    );
  }
}
