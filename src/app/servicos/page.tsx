import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "Serviços | Murilo Valiati",
  description:
    "Sites institucionais, lojas virtuais e painéis sob medida — com área administrativa própria para você atualizar o conteúdo sozinho.",
};

const WHATSAPP = "https://wa.me/5563992245513";
const WHATSAPP_LABEL = "(63) 99224-5513";
const EMAIL = "murilo.valiat@gmail.com";

const SERVICOS = [
  {
    titulo: "Site institucional",
    texto:
      "A presença da empresa na internet: quem é, o que faz, provas de trabalho e formas de contato. Preparado para aparecer no Google e para ser aberto no celular.",
    icone: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M7 13h7" />
      </>
    ),
  },
  {
    titulo: "Loja virtual",
    texto:
      "Catálogo, carrinho, frete, Pix e cartão. Pensada para a pessoa comprar em poucos cliques, com preço e parcelamento visíveis desde a vitrine.",
    icone: (
      <>
        <path d="M6 8h12l1.2 12H4.8L6 8z" />
        <path d="M9 8V6.2A3 3 0 0112 3.2a3 3 0 013 3V8" />
      </>
    ),
  },
  {
    titulo: "Painel e automação",
    texto:
      "Sistemas internos para organizar o que hoje vive em planilha: cadastros, acompanhamento e relatórios, com acesso por usuário e permissão.",
    icone: (
      <>
        <path d="M4 6h16M4 12h16M4 18h10" />
        <circle cx="18" cy="18" r="2.4" />
      </>
    ),
  },
];

const TRABALHOS = [
  {
    titulo: "Portfólio com painel próprio",
    estado: "No ar",
    destaque: true,
    texto:
      "Site pessoal com área administrativa: login por sessão, edição de textos e upload de imagem direto pelo navegador.",
    ganho: "O conteúdo muda sem tocar em código e sem chamar programador.",
    link: { href: "/", label: "Você está nele" },
    stack: ["Next.js", "TypeScript", "Docker", "AWS"],
  },
  {
    titulo: "Assistente de estudos com IA",
    estado: "Acesso restrito",
    destaque: false,
    texto:
      "Plataforma de ensino com cursos, módulos e aulas, e um chat com inteligência artificial que responde sobre o conteúdo da aula aberta.",
    ganho: "Integração com IA e controle de acesso por usuário.",
    link: null,
    stack: ["Next.js", "Gemini", "Autenticação"],
  },
  {
    titulo: "Rastreador de hábitos",
    estado: "Acesso restrito",
    destaque: false,
    texto:
      "Aplicação de acompanhamento diário: cadastro de hábitos, marcação por dia e visão de constância ao longo do tempo.",
    ganho: "Dados gravados, lidos e conferidos todo dia sem erro.",
    link: null,
    stack: ["Next.js", "Banco de dados"],
  },
  {
    titulo: "E-commerce de semijoias",
    estado: "Conceito",
    destaque: true,
    texto:
      "Protótipo navegável de loja virtual, com catálogo, filtros por categoria e metal, página de produto e sacola com barra de frete grátis.",
    ganho: "Decisões de layout tomadas para vender, não só para enfeitar.",
    link: { href: "https://artcoco-conceito.vercel.app", label: "Abrir protótipo" },
    stack: ["Conceito sem vínculo oficial"],
  },
];

const PASSOS = [
  {
    n: "01",
    titulo: "Conversa",
    texto: "Entendo o negócio, o que precisa vender e o que já existe hoje. Sem compromisso.",
    quando: "~30 min",
  },
  {
    n: "02",
    titulo: "Proposta",
    texto: "Escopo por escrito, com o que está incluso, o que não está, prazo e valor fechado.",
    quando: "até 2 dias",
  },
  {
    n: "03",
    titulo: "Desenvolvimento",
    texto: "Você acompanha por um link que atualiza sozinho e me diz o que ajustar no caminho.",
    quando: "combinado na proposta",
  },
  {
    n: "04",
    titulo: "Entrega e treino",
    texto: "Site no ar no seu domínio, com sessão de treinamento do painel e o vídeo gravado.",
    quando: "1 dia",
  },
];

const GARANTIAS = [
  { titulo: "30 dias de ajustes inclusos", texto: "Correções e pequenas mudanças sem custo adicional." },
  { titulo: "Resposta em até 24h úteis", texto: "Por WhatsApp ou e-mail, com você sabendo o prazo do reparo." },
  { titulo: "O site é seu", texto: "Domínio, hospedagem e código ficam no seu nome. Sem amarra." },
  { titulo: "Manutenção mensal opcional", texto: "Atualizações, backup e acompanhamento, se você quiser." },
];

const display = "font-[family-name:var(--font-display)] font-semibold tracking-[-0.015em]";
const eyebrow =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]";
const lead = "text-[17px] leading-[1.7] text-[var(--color-muted)]";
const pill =
  "inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3.5 py-1.5 text-[12.5px] text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]";
const card =
  "rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-accent)]";
const btnSolid =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-background)] transition hover:opacity-90";
const btnLine =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-semibold transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]";

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="mt-0.5 h-[19px] w-[19px] shrink-0 fill-none stroke-[var(--color-accent)]"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function ServicosPage() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background)]/[.82] backdrop-blur-[8px]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-[18px] sm:px-7">
          <a
            href="/"
            className={`shrink-0 ${display} text-[19px] tracking-[0.01em]`}
          >
            Murilo Valiati
          </a>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-6">
            <nav className="no-scrollbar flex gap-4 overflow-x-auto text-sm sm:gap-[30px]">
              <a href="/" className="nav-link shrink-0 opacity-[.72] transition hover:opacity-100">
                Portfólio
              </a>
              <a href="#trabalhos" className="nav-link shrink-0 opacity-[.72] transition hover:opacity-100">
                Trabalhos
              </a>
              <a href="#contato" className="nav-link shrink-0 opacity-[.72] transition hover:opacity-100">
                Contato
              </a>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 sm:px-7">
        {/* hero */}
        <section className="flex flex-col items-start gap-5 py-12 md:py-20">
          <span className={eyebrow}>Desenvolvimento web sob medida</span>
          <h1 className={`${display} text-[clamp(32px,5vw,52px)] leading-[1.12] text-balance`}>
            Um site que{" "}
            <em className="italic text-[var(--color-accent)]">você mesmo atualiza</em>.
          </h1>
          <p className={`max-w-[60ch] ${lead}`}>
            Crio sites institucionais, lojas virtuais e painéis sob medida. Cada projeto sai com uma
            área administrativa própria — você troca textos, fotos e produtos sozinho, sem depender
            de mim e sem pagar por alteração.
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <a href="#contato" className={btnSolid}>
              Pedir um orçamento
            </a>
            <a href="#trabalhos" className={btnLine}>
              Ver trabalhos
            </a>
          </div>

          <dl className="mt-4 grid w-full grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
            {[
              ["3", "aplicações minhas rodando em produção hoje"],
              ["24h", "é o meu prazo de resposta em dias úteis"],
              ["30 dias", "de ajustes inclusos depois da entrega"],
            ].map(([n, t]) => (
              <div key={t} className="bg-[var(--color-background)] px-5 py-4">
                <dt className={`${display} text-[22px] text-[var(--color-accent)]`}>{n}</dt>
                <dd className="text-[13px] leading-snug text-[var(--color-muted)]">{t}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* servicos */}
        <ScrollReveal className="border-t border-[var(--color-border)] py-12 md:py-16">
          <header className="mb-8 max-w-[62ch]">
            <span className={eyebrow}>O que eu faço</span>
            <h2 className={`${display} mt-2.5 text-[clamp(24px,3.2vw,34px)]`}>
              Três frentes, um jeito de trabalhar
            </h2>
            <p className={`mt-3 ${lead}`}>
              Independente do tipo de projeto, a entrega inclui painel de administração, site rápido
              no celular e treinamento de uso.
            </p>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICOS.map((s) => (
              <article key={s.titulo} className={`${card} flex flex-col gap-3`}>
                <span className="mb-1 grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent)]/8 text-[var(--color-accent)]">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-5 w-5 fill-none stroke-current"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {s.icone}
                  </svg>
                </span>
                <h3 className={`${display} text-[19px]`}>{s.titulo}</h3>
                <p className="text-[14.5px] leading-relaxed text-[var(--color-muted)]">{s.texto}</p>
              </article>
            ))}
          </div>
        </ScrollReveal>

        {/* trabalhos */}
        <ScrollReveal id="trabalhos" className="border-t border-[var(--color-border)] py-12 md:py-16">
          <header className="mb-8 max-w-[62ch]">
            <span className={eyebrow}>Trabalhos</span>
            <h2 className={`${display} mt-2.5 text-[clamp(24px,3.2vw,34px)]`}>O que já está no ar</h2>
            <p className={`mt-3 ${lead}`}>
              Projetos que eu construí do início ao fim: interface, servidor, banco de dados e
              publicação.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            {TRABALHOS.map((t) => (
              <article key={t.titulo} className={`${card} flex flex-col gap-3`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className={`${display} text-[19px]`}>{t.titulo}</h3>
                  <span
                    className={`shrink-0 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] ${
                      t.destaque
                        ? "bg-[var(--color-accent)]/8 text-[var(--color-accent)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    {t.estado}
                  </span>
                </div>
                <p className="text-[14.5px] leading-relaxed text-[var(--color-muted)]">{t.texto}</p>
                <p className="border-l-2 border-[var(--color-accent)] pl-3 text-sm">{t.ganho}</p>
                <div className="flex flex-wrap gap-2">
                  {t.link ? (
                    <a
                      className={pill}
                      href={t.link.href}
                      {...(t.link.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {t.link.label}
                    </a>
                  ) : (
                    <span className={pill}>Demonstração sob agendamento</span>
                  )}
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-1.5">
                  {t.stack.map((s) => (
                    <span
                      key={s}
                      className={`${pill} font-[family-name:var(--font-mono)] text-[11.5px]`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </ScrollReveal>

        {/* controle */}
        <ScrollReveal className="border-t border-[var(--color-border)] py-12 md:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <span className={eyebrow}>Sem depender de ninguém</span>
              <h2 className={`${display} mt-2.5 text-[clamp(24px,3.2vw,34px)]`}>
                Você no controle do seu conteúdo
              </h2>
              <p className={`mt-3 ${lead}`}>
                O maior problema de quem contrata site não é o visual: é ficar refém. Trocar uma foto
                vira orçamento, corrigir um preço vira espera de uma semana. Por isso todo projeto
                meu já nasce com painel.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {[
                  "Trocar textos, fotos e banners quando quiser",
                  "Cadastrar e editar produtos, preços e estoque",
                  "Acesso separado por pessoa da equipe",
                  "Treinamento gravado, para consultar depois",
                ].map((i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-[15px] text-[var(--color-muted)]"
                  >
                    <Check />
                    {i}
                  </li>
                ))}
              </ul>
            </div>

            <div
              aria-hidden
              className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="mb-4 flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <i key={i} className="block h-2.5 w-2.5 rounded-full bg-[var(--color-border)]" />
                ))}
              </div>
              {(
                [
                  ["Banner da home", "editar"],
                  ["Produtos · 24 ativos", "gerenciar"],
                  ["Frete grátis a partir de", "R$ 159,00"],
                  ["Desconto no Pix", "5%"],
                  ["Usuários com acesso", "3"],
                ] as const
              ).map(([k, v], i, a) => (
                <div
                  key={k}
                  className={`flex items-center justify-between gap-3 py-3 text-sm ${
                    i < a.length - 1 ? "border-b border-[var(--color-border)]" : ""
                  }`}
                >
                  <span className="text-[var(--color-muted)]">{k}</span>
                  <span className="font-[family-name:var(--font-mono)] text-[12.5px] text-[var(--color-accent)]">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* como funciona */}
        <ScrollReveal className="border-t border-[var(--color-border)] py-12 md:py-16">
          <header className="mb-8">
            <span className={eyebrow}>Como funciona</span>
            <h2 className={`${display} mt-2.5 text-[clamp(24px,3.2vw,34px)]`}>
              Do primeiro contato ao site no ar
            </h2>
          </header>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map((p) => (
              <li
                key={p.n}
                className="flex flex-col gap-2 border-t-2 border-[var(--color-border)] pt-4 transition hover:border-[var(--color-accent)]"
              >
                <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-accent)]">
                  {p.n}
                </span>
                <h3 className={`${display} text-[17px]`}>{p.titulo}</h3>
                <p className="text-[13.5px] leading-snug text-[var(--color-muted)]">{p.texto}</p>
                <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
                  {p.quando}
                </span>
              </li>
            ))}
          </ol>
        </ScrollReveal>

        {/* depois da entrega */}
        <ScrollReveal className="border-t border-[var(--color-border)] py-12 md:py-16">
          <div className="grid gap-8 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:grid-cols-2 md:p-9">
            <div>
              <span className={eyebrow}>Depois da entrega</span>
              <h2 className={`${display} mt-2.5 text-[clamp(24px,3.2vw,34px)]`}>Eu não sumo</h2>
              <p className={`mt-3 ${lead}`}>
                Quase todo negócio pequeno já foi abandonado por alguém no meio do caminho. Deixo por
                escrito o que acontece depois que o site entra no ar.
              </p>
            </div>
            <ul className="flex flex-col gap-3.5">
              {GARANTIAS.map((g) => (
                <li key={g.titulo} className="flex items-start gap-3">
                  <Check />
                  <span>
                    <b className="block text-[14.5px] font-semibold">{g.titulo}</b>
                    <span className="text-[13.5px] leading-snug text-[var(--color-muted)]">
                      {g.texto}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>

        {/*
          DEPOIMENTOS — ativar quando houver pelo menos dois reais e autorizados.
          Nao publicar com texto de exemplo: depoimento inventado destroi exatamente
          a credibilidade que esta pagina inteira esta tentando construir.
        */}

        {/* contato */}
        <section id="contato" className="flex flex-col items-start gap-4 border-t border-[var(--color-border)] py-12 md:py-20">
          <span className={eyebrow}>Contato</span>
          <h2 className={`${display} text-[clamp(24px,3.2vw,34px)]`}>Me conte o que você precisa</h2>
          <p className={`max-w-[60ch] ${lead}`}>
            Descreva o negócio e o que o site precisa resolver. Respondo em até 24h úteis com as
            próximas perguntas ou já com uma proposta.
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <a href={`mailto:${EMAIL}`} className={btnSolid}>
              Enviar e-mail
            </a>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={btnLine}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-[17px] w-[17px] shrink-0 fill-none stroke-current"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.5 3.5A10.4 10.4 0 003.6 16.2L2.5 21.5l5.4-1.1A10.4 10.4 0 1020.5 3.5z" />
                <path d="M8.4 7.9c.2-.5.4-.5.7-.5h.6c.2 0 .5 0 .7.5l.8 2c.1.3 0 .5-.1.7l-.5.6c-.2.2-.3.4-.1.7a7.2 7.2 0 003.4 3c.4.2.6.1.8-.1l.6-.7c.2-.2.4-.2.7-.1l1.9.9c.3.2.5.3.5.5v.7c0 .5-.4 1.1-.8 1.3-.6.3-1.4.5-2.3.3a10 10 0 01-6.9-6.3c-.3-1-.3-2 0-2.7z" />
              </svg>
              {WHATSAPP_LABEL}
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] px-6 py-7 text-center text-[13px] text-[var(--color-muted)]">
        Murilo Valiati · Desenvolvimento web · {EMAIL} · {WHATSAPP_LABEL}
      </footer>
    </>
  );
}
