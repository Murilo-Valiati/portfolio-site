import { NextRequest, NextResponse } from "next/server";
import { addHabit, deleteHabit, getHabits, type HabitCategory } from "@/lib/agenda";

const VALID_CATEGORIES: HabitCategory[] = ["ancora", "bom", "mau"];

export async function GET() {
  const habits = await getHabits();
  return NextResponse.json({ habits });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const category = body?.category as HabitCategory;
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : "";

  if (!name || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const habit = await addHabit(name, category, emoji || "•");
  return NextResponse.json({ habit });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }

  await deleteHabit(id);
  return NextResponse.json({ ok: true });
}
