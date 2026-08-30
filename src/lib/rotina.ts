import path from "path";
import { readJson, writeJsonAtomic } from "@/lib/json-store";
import { getNotes } from "@/lib/notes";
import { getHabits, getDaysInRange, getDayEntry, isVisibleOn } from "@/lib/agenda";
import { googleConfigurado, listarEventos } from "@/lib/google-calendar";
import { enviarPushover, pushoverConfigurado } from "@/lib/pushover";
import { OFFSET_SP } from "@/lib/interprete";

/**
 * A rotina que vem até você:
 * - Resumo matinal (todo dia às 7h): a agenda do dia + o que espera por você.
 * - Revisão semanal (domingo às 20h): o que foi ditado, cumprido e abandonado.
 *
 * O tick roda a cada minuto. O disparo é "às 7h OU assim que o servidor puder
 * depois disso" — se o container estiver reiniciando às 7h em ponto, o resumo
 * sai às 7h01, não some. O estado em /data/rotina.json garante 1 envio por dia
 * mesmo com reinícios.
 */

const HORA_RESUMO = 7;
const HORA_REVISAO = 20;
const DOMINGO = 0;
const URL_PAINEL = "https://murilovaliati.com.br/admin/hoje";

interface EstadoRotina {
  resumoEnviadoEm?: string; // YYYY-MM-DD
  revisaoEnviadaEm?: string;
}

const DATA_DIR = process.env.CONTENT_DATA_DIR || path.join(process.cwd(), ".data");
const ESTADO_FILE = path.join(DATA_DIR, "rotina.json");

/* ------------------------------------------------------------ tempo (SP) -- */

function partesSP(d = new Date()): {
  data: string;
  hora: number;
  diaSemana: number;
  rotulo: string;
} {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "long",
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const data = `${p.year}-${p.month}-${p.day}`;
  const dias = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ];
  const nome = String(p.weekday).toLowerCase();
  return {
    data,
    hora: Number(p.hour),
    diaSemana: Math.max(0, dias.indexOf(nome)),
    rotulo: `${String(p.weekday)[0].toUpperCase()}${String(p.weekday).slice(1)}, ${p.day}/${p.month}`,
  };
}

function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* --------------------------------------------------------------- resumos -- */

export async function montarResumoMatinal(): Promise<{
  titulo: string;
  mensagem: string;
}> {
  const { data, rotulo } = partesSP();
  const linhas: string[] = [];

  if (googleConfigurado()) {
    const eventos = await listarEventos(
      `${data}T00:00:00${OFFSET_SP}`,
      `${data}T23:59:59${OFFSET_SP}`
    );
    if (eventos.length === 0) {
      linhas.push("Agenda livre hoje.");
    } else {
      for (const ev of eventos) {
        const titulo = (ev.summary || "(sem título)").replace(/\s*-\s*Me Ligue\s*$/i, "");
        const alarme = /-\s*Me Ligue\s*$/i.test(ev.summary || "") ? " 🔔" : "";
        const hora = ev.start?.dateTime ? `${horaLocal(ev.start.dateTime)} — ` : "";
        linhas.push(`${hora}${titulo}${alarme}`);
      }
    }
  }

  const notas = await getNotes();
  const atencao = notas.filter((n) => n.status === "aguardando" || n.status === "erro").length;
  const pendentes = notas.filter((n) => n.status === "pendente").length;
  if (atencao > 0) {
    linhas.push(`⚠ ${atencao === 1 ? "1 nota espera" : `${atencao} notas esperam`} por você`);
  }
  if (pendentes > 0) {
    linhas.push(`⏳ ${pendentes} na fila`);
  }

  const habitos = (await getHabits()).filter((h) => isVisibleOn(h, data));
  if (habitos.length > 0) {
    linhas.push(`✅ ${habitos.length} hábito${habitos.length > 1 ? "s" : ""} no plano de hoje`);
  }

  return { titulo: `☀️ ${rotulo}`, mensagem: linhas.join("\n") };
}

export async function montarRevisaoSemanal(): Promise<{
  titulo: string;
  mensagem: string;
}> {
  const { data } = partesSP();
  const inicio = somarDias(data, -6);
  const linhas: string[] = [];

  // Notas da semana
  const notas = await getNotes();
  const daSemana = notas.filter((n) => {
    const dia = new Date(n.createdAt).toLocaleDateString("sv-SE", {
      timeZone: "America/Sao_Paulo",
    });
    return dia >= inicio && dia <= data;
  });
  const viraramEvento = daSemana.filter((n) => n.status === "processado" && n.evento).length;
  const emAtencao = notas.filter(
    (n) => n.status === "aguardando" || n.status === "erro"
  ).length;

  linhas.push(
    `🎙️ ${daSemana.length} nota${daSemana.length === 1 ? "" : "s"} ditada${daSemana.length === 1 ? "" : "s"}, ${viraramEvento} viraram evento`
  );
  if (emAtencao > 0) {
    linhas.push(`⚠ ${emAtencao} ainda esperando você — resolva ou apague`);
  }

  // Hábitos da semana
  const habitos = await getHabits();
  const dias = await getDaysInRange(inicio, data);
  let previstos = 0;
  let cumpridos = 0;
  let mausMarcados = 0;
  for (let i = 0; i < 7; i++) {
    const dia = somarDias(inicio, i);
    const entry = dias.find((d) => d.date === dia) || { date: dia, checked: [] };
    for (const h of habitos) {
      if (!isVisibleOn(h, dia)) continue;
      if (h.category === "mau") {
        if (entry.checked.includes(h.id)) mausMarcados++;
        continue;
      }
      previstos++;
      if (entry.checked.includes(h.id)) cumpridos++;
    }
  }
  if (previstos > 0) {
    const pct = Math.round((cumpridos / previstos) * 100);
    linhas.push(`✅ Hábitos: ${cumpridos}/${previstos} (${pct}%)`);
  }
  if (mausMarcados > 0) {
    linhas.push(`👿 Maus hábitos marcados ${mausMarcados}× na semana`);
  }

  if (googleConfigurado()) {
    const eventos = await listarEventos(
      `${inicio}T00:00:00${OFFSET_SP}`,
      `${data}T23:59:59${OFFSET_SP}`
    );
    linhas.push(`📅 ${eventos.length} evento${eventos.length === 1 ? "" : "s"} na agenda da semana`);
  }

  return { titulo: "🗓️ Revisão da semana", mensagem: linhas.join("\n") };
}

/* ------------------------------------------------------------------ tick -- */

let rodando = false;

export async function tickRotina(): Promise<void> {
  if (rodando || !pushoverConfigurado()) return;
  rodando = true;

  try {
    const { data, hora, diaSemana } = partesSP();
    const estado = await readJson<EstadoRotina | null>(ESTADO_FILE, null);

    // Primeira execução da vida: semeia o estado sem enviar nada, pra um
    // deploy à noite não disparar o "resumo matinal" de madrugada.
    if (estado === null) {
      await writeJsonAtomic(ESTADO_FILE, {
        resumoEnviadoEm: data,
        revisaoEnviadaEm: data,
      } satisfies EstadoRotina);
      return;
    }

    if (hora >= HORA_RESUMO && estado.resumoEnviadoEm !== data) {
      const r = await montarResumoMatinal();
      await enviarPushover({
        ...mensagemComPainel(r),
        prioridade: 0,
      });
      estado.resumoEnviadoEm = data;
      await writeJsonAtomic(ESTADO_FILE, estado);
    }

    if (
      diaSemana === DOMINGO &&
      hora >= HORA_REVISAO &&
      estado.revisaoEnviadaEm !== data
    ) {
      const r = await montarRevisaoSemanal();
      await enviarPushover({
        ...mensagemComPainel(r),
        prioridade: 0,
      });
      estado.revisaoEnviadaEm = data;
      await writeJsonAtomic(ESTADO_FILE, estado);
    }
  } catch (err) {
    // Próximo tick tenta de novo; o estado só avança após envio com sucesso.
    console.error("[rotina]", err);
  } finally {
    rodando = false;
  }
}

function mensagemComPainel(r: { titulo: string; mensagem: string }) {
  return {
    titulo: r.titulo,
    mensagem: r.mensagem,
    url: URL_PAINEL,
    urlTitulo: "Abrir o painel Hoje",
  };
}
