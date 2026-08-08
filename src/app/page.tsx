import { getContent } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageBar } from "@/components/language-bar";
import { ExpandableText } from "@/components/expandable-text";

export const dynamic = "force-dynamic";

const nav = [
  { href: "#sobre", label: "Sobre" },
  { href: "#experiencia", label: "Experiência" },
  { href: "#projetos", label: "Projetos" },
  { href: "#contato", label: "Contato" },
];

export default async function Home() {
  const { profile, skills, experience, projects, languages, contact } =
    await getContent();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="#sobre" className="shrink-0 font-semibold">
            {profile.shortName}
          </a>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <nav className="no-scrollbar flex gap-4 overflow-x-auto text-sm sm:gap-6">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="shrink-0 opacity-80 transition hover:opacity-100 hover:text-[var(--color-accent)]"
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

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-24 px-6 py-16">
        <section id="sobre" className="flex flex-col items-start gap-6 pt-8">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)] text-xl font-semibold text-[var(--rich-black)]">
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
            <h1 className="text-3xl font-bold sm:text-4xl">{profile.name}</h1>
            <p className="mt-1 text-lg text-[var(--color-accent)]">
              {profile.title}
            </p>
          </div>
          <p className="max-w-2xl leading-relaxed opacity-90">{profile.bio}</p>
          <ul className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>

        <section id="experiencia" className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold">Experiência</h2>
          <div className="flex flex-col gap-4">
            {experience.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{item.role}</h3>
                  <span className="text-xs opacity-60">{item.period}</span>
                </div>
                {item.place && (
                  <p className="text-sm text-[var(--color-accent)]">{item.place}</p>
                )}
                <ExpandableText text={item.description} />
              </article>
            ))}
          </div>
        </section>

        <section id="idiomas" className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold">Idiomas</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {languages.map((language) => (
              <LanguageBar
                key={language.name}
                name={language.name}
                level={language.level}
              />
            ))}
          </div>
        </section>

        <section id="projetos" className="flex flex-col gap-8">
          <h2 className="text-2xl font-bold">Projetos</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-accent)]"
              >
                <h3 className="font-semibold">{project.title}</h3>
                <p className="text-sm leading-relaxed opacity-80">
                  {project.description}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-xs text-[var(--rich-black)]"
                      style={{ background: "var(--color-accent-soft)" }}
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex gap-4 pt-2 text-sm">
                  <a
                    href={project.link}
                    className="underline underline-offset-4 opacity-80 hover:opacity-100 hover:text-[var(--color-accent)]"
                  >
                    Ver projeto
                  </a>
                  <a
                    href={project.repo}
                    className="underline underline-offset-4 opacity-80 hover:opacity-100 hover:text-[var(--color-accent)]"
                  >
                    Código
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="contato" className="flex flex-col gap-4 pb-8">
          <h2 className="text-2xl font-bold">Contato</h2>
          <p className="max-w-xl opacity-80">
            Quer trocar uma ideia ou falar sobre uma oportunidade? Me chame por
            um dos canais abaixo.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href={`mailto:${contact.email}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Email
            </a>
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              LinkedIn
            </a>
            <a
              href={contact.github}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              GitHub
            </a>
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              WhatsApp
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] px-6 py-6 text-center text-sm opacity-60">
        © {new Date().getFullYear()} {profile.name}
      </footer>
    </>
  );
}
