import { getNotes, updateNote, type Note } from "@/lib/notes";
import {
  interpretarNota,
  type Interpretacao,
  OFFSET_SP,
} from "@/lib/interprete";
import {
  buscarEvento,
  criarEvento,
  excluirEvento,
  googleConfigurado,
  listarEventos,
  remarcarEvento,
  type EventoGoogle,
  type NovoEvento,
} from "@/lib/google-calendar";

/**
 * O worker que substitui a automação externa (Cowork). Roda na hora em que a
 * nota chega e num cron de segurança a cada 5 minutos.
 *
 * Princípios herdados dos erros da automação anterior — não relaxar:
 * - Nota só vira "processado" DEPOIS que o Google confirma o evento.
 * - Horário no passado nunca escorrega para outro dia: vira "aguardando".
 * - Idempotência: o id do evento é gravado na nota antes do status final;
 *   uma execução interrompida no meio é adotada pela seguinte, nunca duplicada.
 * - Falha técnica tenta 3 vezes e então vira "erro" com aviso — a fila nunca
 *   para em silêncio.
 */

const MAX_TENTATIVAS = 3;
const MIN_CONFIANCA = 0.6;
const DURACAO_PADRAO_MIN = 60;
const SUFIXO_LIGACAO = " - Me Ligue";

let rodando = false;

export async function processarFila(): Promise<void> {
  if (rodando) return;
  if (!googleConfigurado()) {
    // Sem o Google configurado o site se comporta exatamente como antes:
    // notas ficam pendentes para a automação externa. Nenhum log barulhento.
    return;
  }

  rodando = true;
  try {
    const pendentes = (await getNotes("pendente")).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    for (const nota of pendentes) {
      await processarNota(nota).catch(async (err) => {
        const aviso = err instanceof Error ? err.message : String(err);

        // Indisponibilidade transitória do provedor (cota do Gemini, 5xx do
        // Google) não é culpa da nota: não queima tentativa, só espera o
        // próximo ciclo do cron. O aviso aparece no painel mesmo assim.
        if (/\((429|500|502|503|504)\)/.test(aviso)) {
          await updateNote(nota.id, {
            aviso: `Provedor indisponível agora — vou tentar de novo sozinho. (${aviso.slice(0, 140)})`,
          });
          console.warn(`[agenda-worker] nota ${nota.id} adiada:`, aviso);
          return;
        }

        const tentativas = (nota.tentativas || 0) + 1;
        await updateNote(nota.id, {
          tentativas,
          aviso: `Falha técnica (tentativa ${tentativas}/${MAX_TENTATIVAS}): ${aviso}`,
          ...(tentativas >= MAX_TENTATIVAS ? { status: "erro" as const } : {}),
        });
        console.error(`[agenda-worker] nota ${nota.id}:`, err);
      });
    }
  } finally {
    rodando = false;
  }
}

async function processarNota(nota: Note): Promise<void> {
  // Execução anterior pode ter criado o evento e caído antes do status final.
  if (nota.evento?.googleEventId) {
    const existente = await buscarEvento(nota.evento.googleEventId);
    if (existente) {
      await concluir(nota, `Evento confirmado: ${nota.evento.titulo}`);
      return;
    }
    // Evento sumiu (excluído à mão?): limpa e recomeça do zero.
    await updateNote(nota.id, { evento: undefined });
  }

  let interp = nota.interpretacao;
  if (!interp) {
    interp = await interpretarNota(nota);
    await updateNote(nota.id, { interpretacao: interp });
  }

  if (interp.acao === "nada") {
    await aguardar(nota, interp.pendencia || "A nota não parece ser um comando de agenda.");
    return;
  }
  if (interp.pendencia) {
    await aguardar(nota, interp.pendencia);
    return;
  }
  if (interp.confianca < MIN_CONFIANCA) {
    await aguardar(
      nota,
      `Interpretação incerta (confiança ${interp.confianca.toFixed(2)}). Reabra pra tentar de novo ou dite com mais detalhe.`
    );
    return;
  }

  if (interp.acao === "criar") await criar(nota, interp);
  else if (interp.acao === "cancelar") await cancelar(nota, interp);
  else await alterar(nota, interp);
}

/* ---------------------------------------------------------------- ações -- */

async function criar(nota: Note, interp: Interpretacao): Promise<void> {
  if (!interp.data) {
    await aguardar(nota, "Não consegui identificar a data do compromisso.");
    return;
  }
  if (interp.ligar && !interp.hora) {
    await aguardar(
      nota,
      "Você pediu ligação, mas não disse a hora — não vou inventar uma. Dite de novo com o horário."
    );
    return;
  }

  const ev = montarEvento(interp);

  if (comecouNoPassado(ev)) {
    await aguardar(
      nota,
      `O horário calculado (${legivel(ev.inicio)}) já passou. Não vou empurrar pra outro dia — dite de novo se ainda quiser.`
    );
    return;
  }

  // Dedup: uma execução anterior pode ter criado o evento e falhado antes de
  // gravar o id na nota. Se um evento igual já está lá, adota em vez de duplicar.
  const janela = janelaDoDia(interp.data);
  const parecidos = await listarEventos(janela.inicio, janela.fim);
  const adotavel = parecidos.find(
    (e) => normalizar(e.summary || "") === normalizar(ev.titulo)
  );

  const criado = adotavel ?? (await criarEvento(ev));

  await gravarEvento(nota, criado, ev, interp.ligar);

  const confirmado = await buscarEvento(criado.id);
  if (!confirmado) {
    throw new Error("Evento criado mas o Google não o confirmou na releitura.");
  }
  await concluir(
    nota,
    adotavel ? `Evento já existia, adotado: ${ev.titulo}` : undefined
  );
}

async function cancelar(nota: Note, interp: Interpretacao): Promise<void> {
  const dia = interp.dataAlvo || interp.data;
  if (!dia) {
    await aguardar(nota, "Não consegui identificar o dia do evento a cancelar.");
    return;
  }

  const alvo = await localizarAlvo(interp.titulo, dia);
  if ("aviso" in alvo) {
    await aguardar(nota, alvo.aviso);
    return;
  }

  await excluirEvento(alvo.evento.id);
  const sumiu = await buscarEvento(alvo.evento.id);
  if (sumiu) throw new Error("Pedi a exclusão mas o evento ainda está lá.");

  await concluir(nota, `Cancelado: ${alvo.evento.summary || interp.titulo}`);
}

async function alterar(nota: Note, interp: Interpretacao): Promise<void> {
  const diaAlvo = interp.dataAlvo || interp.data;
  if (!diaAlvo || !interp.data) {
    await aguardar(
      nota,
      "Não consegui identificar o evento a remarcar ou o novo horário."
    );
    return;
  }

  const alvo = await localizarAlvo(interp.titulo, diaAlvo);
  if ("aviso" in alvo) {
    await aguardar(nota, alvo.aviso);
    return;
  }

  const ev = montarEvento(interp, alvo.evento);
  if (comecouNoPassado(ev)) {
    await aguardar(
      nota,
      `O novo horário (${legivel(ev.inicio)}) já passou. Não vou empurrar pra outro dia.`
    );
    return;
  }

  const remarcado = await remarcarEvento(alvo.evento.id, ev);
  await gravarEvento(nota, remarcado, ev, interp.ligar);

  const confirmado = await buscarEvento(alvo.evento.id);
  if (!confirmado) throw new Error("Remarquei mas o Google não confirmou.");

  await concluir(nota, `Remarcado: ${ev.titulo} → ${legivel(ev.inicio)}`);
}

/* -------------------------------------------------------------- helpers -- */

function montarEvento(interp: Interpretacao, base?: EventoGoogle): NovoEvento {
  const tituloBase =
    interp.titulo ||
    (base?.summary || "").replace(new RegExp(`${SUFIXO_LIGACAO}$`), "");
  const titulo = interp.ligar ? `${tituloBase}${SUFIXO_LIGACAO}` : tituloBase;

  if (!interp.hora) {
    const fim = new Date(`${interp.data}T00:00:00Z`);
    fim.setUTCDate(fim.getUTCDate() + 1);
    return {
      titulo,
      inicio: interp.data!,
      fim: fim.toISOString().slice(0, 10),
      diaInteiro: true,
    };
  }

  const inicio = `${interp.data}T${interp.hora}:00${OFFSET_SP}`;
  const duracao = interp.duracaoMin || DURACAO_PADRAO_MIN;
  const fim = new Date(new Date(inicio).getTime() + duracao * 60_000);
  return {
    titulo,
    inicio,
    fim: fim.toISOString(),
    diaInteiro: false,
  };
}

function comecouNoPassado(ev: NovoEvento): boolean {
  const inicioMs = ev.diaInteiro
    ? new Date(`${ev.inicio}T23:59:59${OFFSET_SP}`).getTime()
    : new Date(ev.inicio).getTime();
  return inicioMs < Date.now() - 60_000;
}

function janelaDoDia(dia: string): { inicio: string; fim: string } {
  return {
    inicio: `${dia}T00:00:00${OFFSET_SP}`,
    fim: `${dia}T23:59:59${OFFSET_SP}`,
  };
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*-\s*me ligue\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalizar(s)
    .split(" ")
    .filter((t) => t.length > 2);
}

/**
 * Acha o evento alvo de um cancelamento/remarcação pelo dia + semelhança de
 * título. Exatamente 1 candidato: retorna. 0 ou vários: devolve um aviso — a
 * decisão volta pra você, nunca é chutada.
 */
async function localizarAlvo(
  titulo: string,
  dia: string
): Promise<{ evento: EventoGoogle } | { aviso: string }> {
  const janela = janelaDoDia(dia);
  const doDia = await listarEventos(janela.inicio, janela.fim);

  const alvoTokens = tokens(titulo);
  const candidatos = doDia.filter((e) => {
    const evTokens = tokens(e.summary || "");
    return (
      alvoTokens.some((t) => evTokens.includes(t)) &&
      (alvoTokens.every((t) => evTokens.includes(t)) ||
        evTokens.every((t) => alvoTokens.includes(t)))
    );
  });

  if (candidatos.length === 1) return { evento: candidatos[0] };
  if (candidatos.length === 0) {
    return {
      aviso: `Não achei "${titulo}" na agenda de ${legivel(dia)}. Nada foi mexido.`,
    };
  }
  return {
    aviso: `Achei ${candidatos.length} eventos parecidos com "${titulo}" em ${legivel(dia)}: ${candidatos
      .map((c) => `"${c.summary}"`)
      .join(", ")}. Nada foi mexido.`,
  };
}

async function gravarEvento(
  nota: Note,
  criado: EventoGoogle,
  ev: NovoEvento,
  ligar: boolean
): Promise<void> {
  await updateNote(nota.id, {
    evento: {
      googleEventId: criado.id,
      titulo: ev.titulo,
      inicio: ev.inicio,
      fim: ev.fim,
      diaInteiro: ev.diaInteiro,
      ligar,
    },
  });
}

async function concluir(nota: Note, aviso?: string): Promise<void> {
  await updateNote(nota.id, {
    status: "processado",
    processadoPor: "site",
    tentativas: undefined,
    aviso,
  });
}

async function aguardar(nota: Note, aviso: string): Promise<void> {
  await updateNote(nota.id, { status: "aguardando", aviso });
}

function legivel(inicio: string): string {
  const soDia = /^\d{4}-\d{2}-\d{2}$/.test(inicio);
  const d = soDia ? new Date(`${inicio}T12:00:00${OFFSET_SP}`) : new Date(inicio);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    ...(soDia ? {} : { hour: "2-digit", minute: "2-digit" }),
  });
}
