import { NextRequest, NextResponse } from "next/server";
import { getDayEntry, toggleHabitForDay } from "@/lib/agenda";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !DATE_REGEX.test(date)) {
    return NextResponse.json({ error: "Parâmetro date inválido." }, { status: 400 });
  }

  const day = await getDayEntry(date);
  return NextResponse.json({ day });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const date = body?.date;
  const habitId = body?.habitId;
  const checked = body?.checked;

  if (
    typeof date !== "string" ||
    !DATE_REGEX.test(date) ||
    typeof habitId !== "string" ||
    !habitId ||
    typeof checked !== "boolean"
  ) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const day = await toggleHabitForDay(date, habitId, checked);
  return NextResponse.json({ day });
}
