"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface EventoDoDia {
  id: string;
  titulo: string;
  hora: string | null; // null = dia inteiro
  alarme: boolean;
  /** Minutos até começar (só para o que ainda não começou). */
  emMinutos: number | null;
}

export interface BootcampInfo {
  feitas: number;
  total: number;
  proximaTitulo: string | null;
  proximaHref: string;
}

function daquiA(min: number): string {
  if (min < 60) return `em ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `em ${h}h${String(m).padStart(2, "0")}` : `em ${h}h`;
}

export interface NotaAtencao {
  id: string;
  texto: string;
  aviso: string;
  erro: boolean;
}

export interface HabitoDoDia {
  id: string;
  nome: string;
  emoji: string;
  categoria: "ancora" | "bom" | "mau";
  feito: boolean;
}

const mono =
  "font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em]";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className={`${mono} opacity-45`}>{titulo}</h2>
      {children}
    </section>
  );
}

export function HojePanel({
  rotulo,
  data,
  saudacao,
  clima,
  sequencia,
  eventos,
  amanha,
  atencao,
  pendentes,
  habitos,
  bootcamp,
  logHref,
}: {
  rotulo: string;
  data: string;
  saudacao: string;
  clima: string | null;
  sequencia: number;
  eventos: EventoDoDia[] | null;
  amanha: string | null;
  atencao: NotaAtencao[];
  pendentes: number;
  habitos: HabitoDoDia[];
  bootcamp: BootcampInfo | null;
  logHref: string;
}) {
  const router = useRouter();
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(habitos.map((h) => [h.id, h.feito]))
  );
  const [reprocessadas, setReprocessadas] = useState<Set<string>>(new Set());

  async function toggleHabito(h: HabitoDoDia) {
    const novo = !checks[h.id];
    setChecks((prev) => ({ ...prev, [h.id]: novo }));
    await fetch("/api/admin/agenda/day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: data, habitId: h.id, checked: novo }),
    }).catch(() => setChecks((prev) => ({ ...prev, [h.id]: !novo })));
  }

  async function tentarDeNovo(id: string) {
    setReprocessadas((prev) => new Set(prev).add(id));
    await fetch(`/api/notas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pendente" }),
    });
    setTimeout(() => router.refresh(), 4000);
  }

  const feitos = Object.values(checks).filter(Boolean).length;
  const planejados = habitos.filter((h) => h.categoria !== "mau").length;

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-6 py-10 text-[var(--color-foreground)] sm:px-10 sm:py-14">
      <div className="mx-auto flex max-w-2xl flex-col gap-9">
        <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-7">
          <a href="/admin" className={`${mono} text-[var(--color-accent)] hover:underline`}>
            ← Painel · Hoje
          </a>
          <h1 className="font-[family-name:var(--font-display)] text-[34px] font-semibold leading-[1.05] sm:text-[42px]">
            {rotulo}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-[family-name:var(--font-mono)] text-[12.5px]">
            <span className="opacity-70">{saudacao}, Murilo</span>
            {clima && (
              <>
                <span className="opacity-25">/</span>
                <span className="opacity-70">{clima}</span>
              </>
            )}
            {sequencia >= 2 && (
              <>
                <span className="opacity-25">/</span>
                <span className="text-[var(--color-accent)]">
                  🔥 âncora firme há {sequencia} dias
                </span>
              </>
            )}
          </div>
        </header>

        <Secao titulo="Agenda do dia">
          {eventos === null ? (
            <p className="text-[14px] opacity-45">
              Não consegui falar com o Google Agenda agora.
            </p>
          ) : eventos.length === 0 ? (
            <p className="text-[14px] opacity-45">Agenda livre. Dia seu.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {eventos.map((ev, i) => {
                const proximo =
                  ev.emMinutos !== null &&
                  eventos.findIndex((e) => e.emMinutos !== null) === i;
                return (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                  >
                    <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-accent)]">
                      {ev.hora ?? "dia todo"}
                    </span>
                    <span className="text-[15px]">{ev.titulo}</span>
                    {proximo && (
                      <span className="rounded-full border border-[var(--color-accent)]/50 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--color-accent)]">
                        {daquiA(ev.emMinutos!)}
                      </span>
                    )}
                    {ev.alarme && (
                      <span title="Alarme antes do evento" className="ml-auto">
                        🔔
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {amanha && (
            <p className="pt-1 font-[family-name:var(--font-mono)] text-[11.5px] opacity-45">
              {amanha}
            </p>
          )}
        </Secao>

        {(atencao.length > 0 || pendentes > 0) && (
          <Secao titulo="Notas">
            {atencao.map((n) => (
              <div
                key={n.id}
                className="flex flex-col gap-2 rounded-[12px] border border-amber-500/40 bg-[var(--color-surface)] px-4 py-3"
              >
                <p className="text-[14px]">{n.texto}</p>
                <p className="text-[13px] text-amber-500">
                  {n.erro ? "⚠ " : ""}
                  {n.aviso}
                </p>
                <div className="flex gap-4">
                  <a
                    href="/admin/notas"
                    className={`${mono} text-[var(--color-accent)] hover:underline`}
                  >
                    corrigir
                  </a>
                  <button
                    onClick={() => tentarDeNovo(n.id)}
                    disabled={reprocessadas.has(n.id)}
                    className={`${mono} text-[var(--color-accent)] hover:underline disabled:opacity-40`}
                  >
                    {reprocessadas.has(n.id) ? "reprocessando…" : "tentar de novo"}
                  </button>
                </div>
              </div>
            ))}
            {pendentes > 0 && (
              <p className="text-[13px] opacity-55">
                ⏳ {pendentes} na fila, sendo processada{pendentes > 1 ? "s" : ""}.
              </p>
            )}
          </Secao>
        )}

        {habitos.length > 0 && (
          <Secao titulo={`Hábitos · ${feitos}/${planejados}`}>
            <ul className="flex flex-col gap-1.5">
              {habitos.map((h) => {
                const feito = checks[h.id];
                const mau = h.categoria === "mau";
                return (
                  <li key={h.id}>
                    <button
                      onClick={() => toggleHabito(h)}
                      className={`flex w-full items-center gap-3 rounded-[10px] border px-4 py-2.5 text-left transition-colors ${
                        feito
                          ? mau
                            ? "border-red-400/50 bg-red-400/10"
                            : "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10"
                          : "border-[var(--color-border)] bg-[var(--color-surface)]"
                      }`}
                    >
                      <span>{h.emoji}</span>
                      <span
                        className={`text-[14.5px] ${feito && !mau ? "line-through opacity-55" : ""}`}
                      >
                        {h.nome}
                      </span>
                      <span className="ml-auto text-[13px] opacity-50">
                        {feito ? (mau ? "caí 😞" : "✓") : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Secao>
        )}

        {bootcamp && (
          <Secao titulo={`Bootcamp · TripleTen · ${bootcamp.feitas}/${bootcamp.total}`}>
            <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${bootcamp.total > 0 ? Math.round((bootcamp.feitas / bootcamp.total) * 100) : 0}%`,
                    background:
                      "linear-gradient(90deg, var(--color-accent), var(--color-accent-strong))",
                  }}
                />
              </div>
              {bootcamp.proximaTitulo ? (
                <a
                  href={bootcamp.proximaHref}
                  className="text-[14.5px] text-[var(--color-accent)] hover:underline"
                >
                  Continuar: {bootcamp.proximaTitulo} →
                </a>
              ) : (
                <p className="text-[14px] opacity-70">Trilha concluída. 🎓</p>
              )}
            </div>
          </Secao>
        )}

        <DitadoRapido aoEnfileirar={() => setTimeout(() => router.refresh(), 4000)} />

        <nav
          aria-label="Atalhos"
          className="grid grid-cols-2 gap-2 border-t border-[var(--color-border)] pt-5 sm:grid-cols-4"
        >
          <a href="/assistente" className={`${mono} rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-center opacity-60 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:opacity-100`}>
            Assistente
          </a>
          <a href="/admin/agenda" className={`${mono} rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-center opacity-60 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:opacity-100`}>
            Hábitos
          </a>
          <a href={logHref} className={`${mono} rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-center opacity-60 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:opacity-100`}>
            Log do Dia
          </a>
          <a href="/admin/notas" className={`${mono} rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-center opacity-60 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:opacity-100`}>
            Notas
          </a>
        </nav>
      </div>
    </main>
  );
}

/** Ditar sem sair da página: grava → transcreve → confere → põe na fila. */
function DitadoRapido({ aoEnfileirar }: { aoEnfileirar: () => void }) {
  const [fase, setFase] = useState<"parado" | "gravando" | "transcrevendo" | "revisando" | "salvando">("parado");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function alternarGravacao() {
    if (fase === "gravando") {
      recorderRef.current?.stop();
      return;
    }
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setFase("transcrevendo");
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const form = new FormData();
        form.append("file", blob, "nota.webm");
        const res = await fetch("/api/admin/transcribe?mode=compromisso", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErro(data.error || "Erro ao transcrever o áudio.");
          setFase("parado");
          return;
        }
        const data = await res.json();
        setTexto(data.text);
        setFase("revisando");
      };
      recorderRef.current = recorder;
      recorder.start();
      setFase("gravando");
    } catch {
      setErro("Não foi possível acessar o microfone.");
      setFase("parado");
    }
  }

  async function enfileirar() {
    const valor = texto.trim();
    if (!valor) return;
    setFase("salvando");
    const res = await fetch("/api/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: valor }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error || "Não foi possível salvar a nota.");
      setFase("revisando");
      return;
    }
    setTexto("");
    setFase("parado");
    aoEnfileirar();
  }

  if (fase === "revisando" || fase === "salvando") {
    return (
      <div className="flex flex-col gap-2 rounded-[12px] border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-4">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          autoFocus
          className="w-full resize-y bg-transparent text-[15px] leading-relaxed outline-none"
        />
        {erro && <p className="text-[13px] text-red-400">{erro}</p>}
        <div className="flex items-center gap-4">
          <button
            onClick={enfileirar}
            disabled={fase === "salvando" || !texto.trim()}
            className={`${mono} text-[var(--color-accent)] underline disabled:opacity-40`}
          >
            {fase === "salvando" ? "salvando…" : "pôr na fila"}
          </button>
          <button
            onClick={() => {
              setTexto("");
              setFase("parado");
            }}
            className={`${mono} opacity-45 hover:opacity-100`}
          >
            descartar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={alternarGravacao}
        disabled={fase === "transcrevendo"}
        className={`rounded-[12px] px-5 py-3.5 text-center font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.16em] transition-colors disabled:opacity-60 ${
          fase === "gravando"
            ? "bg-red-500 text-white"
            : "bg-[var(--color-accent)] text-[var(--color-background)]"
        }`}
      >
        {fase === "gravando"
          ? "■ parar e transcrever"
          : fase === "transcrevendo"
            ? "transcrevendo…"
            : "🎙️ Ditar nota"}
      </button>
      {erro && <p className="text-center text-[13px] text-red-400">{erro}</p>}
    </div>
  );
}
