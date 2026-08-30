import { NextRequest, NextResponse } from "next/server";
import { proposeCourseFromChat, mapearErroGemini, ChatMessage } from "@/lib/gemini";
import { addCustomCourse, getAllCategories } from "@/lib/lms";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const history = Array.isArray(body?.history) ? (body.history as ChatMessage[]) : [];

  if (history.length === 0) {
    return NextResponse.json(
      { error: "É preciso ter uma conversa pra basear o curso." },
      { status: 400 }
    );
  }

  try {
    const categories = await getAllCategories();
    const proposal = await proposeCourseFromChat(history, categories);
    const course = await addCustomCourse(
      proposal.title,
      proposal.description,
      proposal.category
    );
    return NextResponse.json({ course });
  } catch (err) {
    const { status, mensagem } = mapearErroGemini(err);
    return NextResponse.json({ error: mensagem }, { status });
  }
}
