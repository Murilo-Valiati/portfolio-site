import { NextRequest, NextResponse } from "next/server";
import { getDaysInRange, getRecentDays } from "@/lib/agenda";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");

  if (from || to) {
    if (!from || !to || !DATE_REGEX.test(from) || !DATE_REGEX.test(to)) {
      return NextResponse.json(
        { error: "Informe from e to no formato AAAA-MM-DD." },
        { status: 400 }
      );
    }
    const days = await getDaysInRange(from, to);
    return NextResponse.json({ days });
  }

  const countParam = params.get("count");
  const count = countParam
    ? Math.min(Math.max(parseInt(countParam, 10) || 0, 1), 365)
    : 60;

  const days = await getRecentDays(count);
  return NextResponse.json({ days });
}
