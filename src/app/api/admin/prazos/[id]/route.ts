import { NextRequest, NextResponse } from "next/server";
import { deletePrazo } from "@/lib/prazos";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deletePrazo(id);
  return NextResponse.json({ ok: true });
}
