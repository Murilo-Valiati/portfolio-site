import { NextRequest, NextResponse } from "next/server";
import {
  addHabit,
  deleteHabit,
  getHabits,
  renameHabit,
  type HabitCategory,
} from "@/lib/agenda";

const VALID_CATEGORIES: HabitCategory[] = ["ancora", "bom", "mau"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const habits = await getHabits();
  return NextResponse.json({ habits });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const category = body?.category as HabitCategory;
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : "";
  const recurring = body?.recurring !== false;
  const date = typeof body?.date === "string" ? body.date : "";

  if (!name || !VALID_CATEGORIES.includes(category) || !DATE_REGEX.test(date)) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const habit = await addHabit(name, category, emoji || "•", recurring, date);
  return NextResponse.json({ habit });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!id || !name) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const habit = await renameHabit(id, name);
  if (!habit) {
    return NextResponse.json({ error: "Hábito não encontrado." }, { status: 404 });
  }

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
