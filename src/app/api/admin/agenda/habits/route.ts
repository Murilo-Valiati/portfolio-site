import { NextRequest, NextResponse } from "next/server";
import {
  addHabit,
  deleteHabit,
  getHabits,
  renameHabit,
  updateHabitDias,
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
  const temDias = "dias" in (body ?? {});

  if (!id || (!name && !temDias)) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  let habit = null;

  if (name) {
    habit = await renameHabit(id, name);
    if (!habit) {
      return NextResponse.json({ error: "Hábito não encontrado." }, { status: 404 });
    }
  }

  if (temDias) {
    const dias = body.dias;
    const valido =
      dias === null ||
      (Array.isArray(dias) &&
        dias.length > 0 &&
        dias.every((d: unknown) => typeof d === "number" && d >= 0 && d <= 6));
    if (!valido) {
      return NextResponse.json(
        { error: "dias deve ser null ou uma lista de 1 a 7 dias (0=domingo…6=sábado)." },
        { status: 400 }
      );
    }
    habit = await updateHabitDias(
      id,
      dias === null ? null : Array.from(new Set(dias as number[]))
    );
    if (!habit) {
      return NextResponse.json({ error: "Hábito não encontrado." }, { status: 404 });
    }
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
