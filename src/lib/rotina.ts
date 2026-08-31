import path from "path";
import { readJson, writeJsonAtomic } from "@/lib/json-store";
import { getNotes } from "@/lib/notes";
import {
  getHabits,
  getDaysInRange,
  isVisibleOn,
  calcularSequenciaAncora,
} from "@/lib/agenda";
import { contarLicoesConcluidasEntre, progressoDoCurso } from "@/lib/lms";
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
const HORA_VESPERA = 21;
const DOMINGO = 0;
const URL_PAINEL = "https://murilovaliati.com.br/admin/hoje";
const CURSO_BOOTCAMP = "tripleten-full-stack";

// Palmas-TO por padrão; ajuste com CLIMA_LAT/CLIMA_LON se mudar de cidade.
const CLIMA_LAT = process.env.CLIMA_LAT || "-10.24";
const CLIMA_LON = process.env.CLIMA_LON || "-48.35";

interface EstadoRotina {
  resumoEnviadoEm?: string; // YYYY-MM-DD
  revisaoEnviadaEm?: string;
  vesperaEnviadaEm?: string;
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

/** "Segunda-feira, 01/09" para um dia YYYY-MM-DD. */
function rotuloDia(dia: string): string {
  const d = new Date(`${dia}T12:00:00${OFFSET_SP}`);
  const semana = d.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  });
  const data = d.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
  return `${semana[0].toUpperCase()}${semana.slice(1)}, ${data}`;
}

/** "🌤 23–34°C · chuva 10%" via Open-Meteo (grátis, sem chave). */
async function linhaDoClima(diaIndice = 0): Promise<string | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${CLIMA_LAT}&longitude=${CLIMA_LON}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=America%2FSao_Paulo&forecast_days=${diaIndice + 1}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const d = await res.json();
    const max = Math.round(d?.daily?.temperature_2m_max?.[diaIndice]);
    const min = Math.round(d?.daily?.temperature_2m_min?.[diaIndice]);
    const chuva = d?.daily?.precipitation_probability_max?.[diaIndice];
    if (!Number.isFinite(max) || !Number.isFinite(min)) return null;
    return `🌤 ${min}–${max}°C${Number.isFinite(chuva) ? ` · chuva ${chuva}%` : ""}`;
  } catch {
    return null; // clima é enfeite: nunca atrasa nem derruba o resumo
  }
}

/** Eventos de um dia como linhas "10:00 — Título 🔔". */
async function linhasDeEventos(dia: string): Promise<string[] | null> {
  if (!googleConfigurado()) return null;
  const eventos = await listarEventos(
    `${dia}T00:00:00${OFFSET_SP}`,
    `${dia}T23:59:59${OFFSET_SP}`
  );
  return eventos.map((ev) => {
    const titulo = (ev.summary || "(sem título)").replace(/\s*-\s*Me Ligue\s*$/i, "");
    const alarme = /-\s*Me Ligue\s*$/i.test(ev.summary || "") ? " 🔔" : "";
    const hora = ev.start?.dateTime ? `${horaLocal(ev.start.dateTime)} — ` : "";
    return `${hora}${titulo}${alarme}`;
  });
}

/* --------------------------------------------------------------- resumos -- */

export async function montarResumoMatinal(): Promise<{
  titulo: string;
  mensagem: string;
}> {
  const { data, rotulo } = partesSP();
  const linhas: string[] = [];

  const clima = await linhaDoClima(0);
  if (clima) linhas.push(clima);

  const eventos = await linhasDeEventos(data);
  if (eventos !== null) {
    if (eventos.length === 0) linhas.push("Agenda livre hoje.");
    else linhas.push(...eventos);
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

  const sequencia = await calcularSequenciaAncora();
  if (sequencia >= 2) {
    linhas.push(`🔥 Âncora firme há ${sequencia} dias — não quebre a corrente`);
  }

  return { titulo: `☀️ ${rotulo}`, mensagem: linhas.join("\n") };
}

/**
 * Resumo da véspera (21h): planejar à noite funciona melhor que surpresa de
 * manhã. Só é enviado quando amanhã tem evento ou há nota esperando você.
 */
export async function montarResumoVespera(): Promise<{
  titulo: string;
  mensagem: string;
} | null> {
  const { data } = partesSP();
  const amanha = somarDias(data, 1);
  const linhas: string[] = [];

  const eventos = await linhasDeEventos(amanha);
  const notas = await getNotes();
  const atencao = notas.filter((n) => n.status === "aguardando" || n.status === "erro").length;

  if ((eventos?.length ?? 0) === 0 && atencao === 0) return null;

  if (eventos && eventos.length > 0) linhas.push(...eventos);
  if (atencao > 0) {
    linhas.push(`⚠ ${atencao === 1 ? "1 nota ainda espera" : `${atencao} notas ainda esperam`} por você`);
  }

  return { titulo: `🌙 ${rotuloDia(amanha)}`, mensagem: linhas.join("\n") };
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

  // Bootcamp: constância de estudo entra na prestação de contas semanal.
  const licoesSemana = await contarLicoesConcluidasEntre(inicio, data);
  const bootcamp = await progressoDoCurso(CURSO_BOOTCAMP);
  if (licoesSemana > 0) {
    linhas.push(
      `🎓 ${licoesSemana} ${licoesSemana === 1 ? "lição" : "lições"} de curso na semana${
        bootcamp ? ` · TripleTen: ${bootcamp.feitas}/${bootcamp.total}` : ""
      }`
    );
  } else if (bootcamp && bootcamp.feitas < bootcamp.total) {
    linhas.push(
      `🎓 Nenhuma lição na semana — 15 min hoje valem mais que 2h "um dia". TripleTen: ${bootcamp.feitas}/${bootcamp.total}`
    );
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
        vesperaEnviadaEm: data,
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

    if (hora >= HORA_VESPERA && estado.vesperaEnviadaEm !== data) {
      const v = await montarResumoVespera();
      if (v) {
        await enviarPushover({ ...mensagemComPainel(v), prioridade: 0 });
      }
      // Noite sem nada amanhã também conta como "tratada" — silêncio é ok.
      estado.vesperaEnviadaEm = data;
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
