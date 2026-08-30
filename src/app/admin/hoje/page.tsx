import type { Metadata } from "next";
import { getNotes } from "@/lib/notes";
import { getHabits, getDayEntry, isVisibleOn } from "@/lib/agenda";
import { googleConfigurado, listarEventos } from "@/lib/google-calendar";
import { OFFSET_SP } from "@/lib/interprete";
import { HojePanel, type EventoDoDia, type NotaAtencao, type HabitoDoDia } from "@/components/hoje-panel";

export const metadata: Metadata = {
  title: "Hoje",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

function hojeSP(): { data: string; rotulo: string } {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
  const p = Object.fromEntries(
    fmt.formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  const semana = String(p.weekday);
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    rotulo: `${semana[0].toUpperCase()}${semana.slice(1)}, ${p.day}/${p.month}`,
  };
}

export default async function HojePage() {
  const { data, rotulo } = hojeSP();

  let eventos: EventoDoDia[] | null = null;
  if (googleConfigurado()) {
    try {
      const lista = await listarEventos(
        `${data}T00:00:00${OFFSET_SP}`,
        `${data}T23:59:59${OFFSET_SP}`
      );
      eventos = lista.map((ev) => {
        const bruto = ev.summary || "(sem título)";
        return {
          id: ev.id,
          titulo: bruto.replace(/\s*-\s*Me Ligue\s*$/i, ""),
          alarme: /-\s*Me Ligue\s*$/i.test(bruto),
          hora: ev.start?.dateTime
            ? new Date(ev.start.dateTime).toLocaleTimeString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
        };
      });
    } catch {
      eventos = null; // Google fora do ar: a página continua útil sem ele.
    }
  }

  const notas = await getNotes();
  const atencao: NotaAtencao[] = notas
    .filter((n) => n.status === "aguardando" || n.status === "erro")
    .map((n) => ({
      id: n.id,
      texto: n.text,
      aviso: n.aviso || "",
      erro: n.status === "erro",
    }));
  const pendentes = notas.filter((n) => n.status === "pendente").length;

  const dayEntry = await getDayEntry(data);
  const habitos: HabitoDoDia[] = (await getHabits())
    .filter((h) => isVisibleOn(h, data))
    .map((h) => ({
      id: h.id,
      nome: h.name,
      emoji: h.emoji,
      categoria: h.category,
      feito: dayEntry.checked.includes(h.id),
    }));

  return (
    <HojePanel
      rotulo={rotulo}
      data={data}
      eventos={eventos}
      atencao={atencao}
      pendentes={pendentes}
      habitos={habitos}
    />
  );
}
