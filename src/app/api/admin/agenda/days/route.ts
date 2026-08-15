import { NextRequest, NextResponse } from "next/server";
import { getRecentDays } from "@/lib/agenda";

export async function GET(req: NextRequest) {
  const countParam = req.nextUrl.searchParams.get("count");
  const count = countParam ? Math.min(Math.max(parseInt(countParam, 10) || 0, 1), 365) : 60;

  const days = await getRecentDays(count);
  return NextResponse.json({ days });
}
