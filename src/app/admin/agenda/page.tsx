import type { Metadata } from "next";
import { AgendaTracker } from "@/components/agenda-tracker";

export const metadata: Metadata = {
  title: "Agenda",
  robots: { index: false, follow: false, nocache: true },
};

export default function AgendaPage() {
  return <AgendaTracker />;
}
