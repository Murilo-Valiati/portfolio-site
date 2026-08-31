import type { Metadata } from "next";
import { getNotes } from "@/lib/notes";
import { getHabits, getDayEntry, isVisibleOn, calcularSequenciaAncora } from "@/lib/agenda";
import { googleConfigurado, listarEventos } from "@/lib/google-calendar";
import { OFFSET_SP } from "@/lib/interprete";
import { linhaDoClima } from "@/lib/rotina";
import { getCourseWithCustomModules, getProgress } from "@/lib/lms";
import { DAILY_LOG_PATH } from "@/lib/session";
import {
  HojePanel,
  type EventoDoDia,
  type NotaAtencao,
  type HabitoDoDia,
  type BootcampInfo,
} from "@/components/hoje-panel";

export const metadata: Metadata = {
  title: "Hoje",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const CURSO_BOOTCAMP = "tripleten-full-stack";

function diaSP(offsetDias = 0): { data: string; rotulo: string } {
  const d = new Date(Date.now() + offsetDias * 86_400_000);
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const semana = String(p.weekday);
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    rotulo: `${semana[0].toUpperCase()}${semana.slice(1)}, ${p.day}/${p.month}`,
  };
}

function saudacaoSP(): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
  if (hora < 5) return "Boa madrugada";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

async function eventosDe(data: string) {
  return listarEventos(`${data}T00:00:00${OFFSET_SP}`, `${data}T23:59:59${OFFSET_SP}`);
}

export default async function HojePage() {
  const { data, rotulo } = diaSP();
  const amanhaInfo = diaSP(1);

  let eventos: EventoDoDia[] | null = null;
  let amanha: string | null = null;
  if (googleConfigurado()) {
    try {
      const agora = Date.now();
      const lista = await eventosDe(data);
      eventos = lista.map((ev) => {
        const bruto = ev.summary || "(sem título)";
        const inicioMs = ev.start?.dateTime ? new Date(ev.start.dateTime).getTime() : null;
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
          emMinutos:
            inicioMs && inicioMs > agora
              ? Math.round((inicioMs - agora) / 60_000)
              : null,
        };
      });

      const deAmanha = await eventosDe(amanhaInfo.data);
      if (deAmanha.length === 0) {
        amanha = "Amanhã: agenda livre";
      } else if (deAmanha.length === 1) {
        const ev = deAmanha[0];
        const titulo = (ev.summary || "").replace(/\s*-\s*Me Ligue\s*$/i, "");
        const hora = ev.start?.dateTime
          ? ` às ${new Date(ev.start.dateTime).toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "";
        amanha = `Amanhã: ${titulo}${hora}`;
      } else {
        amanha = `Amanhã: ${deAmanha.length} eventos`;
      }
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

  const [clima, sequencia] = await Promise.all([
    linhaDoClima(0),
    calcularSequenciaAncora(),
  ]);

  // Bootcamp: progresso + a primeira lição ainda não concluída, na ordem.
  let bootcamp: BootcampInfo | null = null;
  const curso = await getCourseWithCustomModules(CURSO_BOOTCAMP);
  if (curso) {
    const concluidas = await getProgress(CURSO_BOOTCAMP);
    const todas = curso.modules.flatMap((m) => m.lessons);
    const proxima = todas.find((l) => !concluidas.includes(l.id));
    bootcamp = {
      feitas: concluidas.length,
      total: todas.length,
      proximaTitulo: proxima?.title ?? null,
      proximaHref: proxima
        ? `/assistente/cursos/${CURSO_BOOTCAMP}/${proxima.id}`
        : `/assistente/cursos/${CURSO_BOOTCAMP}`,
    };
  }

  return (
    <HojePanel
      rotulo={rotulo}
      data={data}
      saudacao={saudacaoSP()}
      clima={clima}
      sequencia={sequencia}
      eventos={eventos}
      amanha={amanha}
      atencao={atencao}
      pendentes={pendentes}
      habitos={habitos}
      bootcamp={bootcamp}
      logHref={DAILY_LOG_PATH}
    />
  );
}
