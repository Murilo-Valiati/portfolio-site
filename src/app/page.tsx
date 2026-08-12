import { getContent } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageBar } from "@/components/language-bar";
import { ExpandableText } from "@/components/expandable-text";
import { ScrollReveal } from "@/components/scroll-reveal";

export const dynamic = "force-dynamic";

const nav = [
  { href: "#sobre", label: "Sobre" },
  { href: "#experiencia", label: "Experiência" },
  { href: "#projetos", label: "Projetos" },
  { href: "#contato", label: "Contato" },
  { href: "/assistente", label: "Assistente IA" },
];

export default async function Home() {
  const { profile, skills, experience, projects, languages, contact } =
    await getContent();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background)]/[.82] backdrop-blur-[8px]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-[18px] sm:px-7">
          <a
            href="#sobre"
            className="shrink-0 font-[family-name:var(--font-display)] text-[19px] font-semibold tracking-[0.01em]"
          >
            {profile.shortName}
          </a>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-6">
            <nav className="no-scrollbar flex gap-4 overflow-x-auto text-sm sm:gap-[30px]">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="nav-link shrink-0 opacity-[.72] transition hover:opacity-100"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-24 px-4 pt-16 pb-24 sm:gap-28 sm:px-7 sm:pt-[72px]">
        <ScrollReveal id="sobre" className="flex flex-col items-start gap-7 pt-2">
          <div className="avatar-ring flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)] font-[family-name:var(--font-display)] text-[22px] font-semibold text-[var(--rich-black)]">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              profile.avatarInitials
            )}
          </div>
          <div>
            <h1 className="text-balance font-[family-name:var(--font-display)] text-[34px] font-semibold tracking-[-0.01em] sm:text-[44px]">
              {profile.name}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-3.5">
              <span className="font-[family-name:var(--font-display)] text-[19px] italic text-[var(--color-accent)]">
                {profile.title}
              </span>
              {profile.statusPill && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] py-[5px] pr-3 pl-2.5 text-[11px] tracking-[0.04em] text-[var(--color-muted)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <span className="status-dot h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                  {profile.statusPill}
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 max-w-[620px] text-[17px] leading-[1.75] opacity-[.92]">
            {profile.bio}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2.5">
            {skills.map((skill) => (
              <li
                key={skill}
                className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] py-[7px] pr-[14px] pl-[11px] text-[12.5px] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/8"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-muted)]" />
                {skill}
              </li>
            ))}
          </ul>
        </ScrollReveal>

        <ScrollReveal id="experiencia" className="flex flex-col">
          <h2 className="mb-8 inline-block font-[family-name:var(--font-display)] text-[28px] font-semibold">
            Experiência
            <span className="mt-3 block h-0.5 w-[46px] rounded-full bg-[var(--color-accent)]" />
          </h2>
          <div className="flex flex-col gap-[18px]">
            {experience.map((item) => (
              <article
                key={item.id}
                className="hover-card rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-[26px_28px]"
              >
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2.5">
                  <h3 className="text-lg font-semibold">{item.role}</h3>
                  <span
                    className="text-xs text-[var(--color-muted)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.period}
                  </span>
                </div>
                {item.place && (
                  <p className="mb-2.5 text-[14.5px] text-[var(--color-accent)]">
                    {item.place}
                  </p>
                )}
                <ExpandableText text={item.description} />
              </article>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal id="idiomas" className="flex flex-col">
          <h2 className="mb-8 inline-block font-[family-name:var(--font-display)] text-[28px] font-semibold">
            Idiomas
            <span className="mt-3 block h-0.5 w-[46px] rounded-full bg-[var(--color-accent)]" />
          </h2>
          <div className="grid gap-[22px] sm:grid-cols-3">
            {languages.map((language) => (
              <LanguageBar
                key={language.name}
                name={language.name}
                level={language.level}
              />
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal id="projetos" className="flex flex-col">
          <h2 className="mb-8 inline-block font-[family-name:var(--font-display)] text-[28px] font-semibold">
            Projetos
            <span className="mt-3 block h-0.5 w-[46px] rounded-full bg-[var(--color-accent)]" />
          </h2>
          <div className="grid gap-[22px] sm:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className="hover-card flex flex-col gap-3.5 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-[26px_28px]"
              >
                <h3 className="text-[17px] font-semibold">{project.title}</h3>
                <p className="text-[14.5px] leading-[1.65] opacity-[.82]">
                  {project.description}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="tag-pill rounded-full px-2.5 py-[3px] text-[11px]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex gap-5 pt-1.5 text-sm">
                  <a
                    href={project.link}
                    className="border-b border-current pb-px opacity-[.82] transition hover:opacity-100 hover:text-[var(--color-accent)]"
                  >
                    Ver projeto
                  </a>
                  <a
                    href={project.repo}
                    className="border-b border-current pb-px opacity-[.82] transition hover:opacity-100 hover:text-[var(--color-accent)]"
                  >
                    Código
                  </a>
                </div>
              </article>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal id="contato" className="flex flex-col gap-4 pb-8">
          <h2 className="inline-block font-[family-name:var(--font-display)] text-[28px] font-semibold">
            Contato
            <span className="mt-3 block h-0.5 w-[46px] rounded-full bg-[var(--color-accent)]" />
          </h2>
          <p className="mt-3 max-w-[480px] text-[15px] leading-[1.7] opacity-[.85]">
            Quer trocar uma ideia ou falar sobre uma oportunidade? Me chame por
            um dos canais abaixo.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <a
              href={`mailto:${contact.email}`}
              className="rounded-[10px] border border-[var(--color-accent)] bg-[var(--color-accent)] px-5 py-[11px] text-sm text-[var(--rich-black)] transition hover:border-[var(--color-accent-strong)] hover:bg-[var(--color-accent-strong)]"
            >
              Email
            </a>
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-[10px] border border-[var(--color-border)] px-5 py-[11px] text-sm transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)]"
            >
              LinkedIn
            </a>
            <a
              href={contact.github}
              target="_blank"
              rel="noreferrer"
              className="rounded-[10px] border border-[var(--color-border)] px-5 py-[11px] text-sm transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)]"
            >
              GitHub
            </a>
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="rounded-[10px] border border-[var(--color-border)] px-5 py-[11px] text-sm transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)]"
            >
              WhatsApp
            </a>
          </div>
        </ScrollReveal>
      </main>

      <footer className="border-t border-[var(--color-border)] px-6 py-7 text-center text-[13px] text-[var(--color-muted)]">
        © {new Date().getFullYear()} {profile.name}
      </footer>
    </>
  );
}
