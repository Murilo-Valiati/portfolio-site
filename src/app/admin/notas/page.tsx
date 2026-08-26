import type { Metadata } from "next";
import { NotesPanel } from "@/components/notes-panel";

export const metadata: Metadata = {
  title: "Notas",
  robots: { index: false, follow: false, nocache: true },
};

export default function NotasPage() {
  return <NotesPanel />;
}
