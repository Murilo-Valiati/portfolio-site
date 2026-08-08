import { contact, profile, projects, skills } from "@/content/profile";

const nav = [
  { href: "#sobre", label: "Sobre" },
  { href: "#projetos", label: "Projetos" },
  { href: "#contato", label: "Contato" },
];

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-black/10 bg-[var(--background)]/80 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="font-semibold">{profile.name}</span>
          <nav className="flex gap-6 text-sm">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="opacity-80 transition hover:opacity-100"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-24 px-6 py-16">
        <section id="sobre" className="flex flex-col items-start gap-6 pt-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/5 text-xl font-semibold dark:bg-white/10">
            {profile.avatarInitials}
          </div>
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">{profile.name}</h1>
            <p className="mt-1 text-lg opacity-70">{profile.title}</p>
          </div>
          <p className="max-w-2xl leading-relaxed opacity-90">{profile.bio}</p>
          <ul className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/15"
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>

        <section id="projetos" className="flex flex-col gap-8">
          <h2 className="text-2xl font-bold">Projetos</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.title}
                className="flex flex-col gap-3 rounded-xl border border-black/10 p-5 transition hover:border-black/25 dark:border-white/15 dark:hover:border-white/30"
              >
                <h3 className="font-semibold">{project.title}</h3>
                <p className="text-sm leading-relaxed opacity-80">
                  {project.description}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex gap-4 pt-2 text-sm">
                  <a
                    href={project.link}
                    className="underline underline-offset-4 opacity-80 hover:opacity-100"
                  >
                    Ver projeto
                  </a>
                  <a
                    href={project.repo}
                    className="underline underline-offset-4 opacity-80 hover:opacity-100"
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
              className="rounded-lg border border-black/10 px-4 py-2 transition hover:border-black/25 dark:border-white/15 dark:hover:border-white/30"
            >
              Email
            </a>
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-black/10 px-4 py-2 transition hover:border-black/25 dark:border-white/15 dark:hover:border-white/30"
            >
              LinkedIn
            </a>
            <a
              href={contact.github}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-black/10 px-4 py-2 transition hover:border-black/25 dark:border-white/15 dark:hover:border-white/30"
            >
              GitHub
            </a>
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-black/10 px-4 py-2 transition hover:border-black/25 dark:border-white/15 dark:hover:border-white/30"
            >
              WhatsApp
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 px-6 py-6 text-center text-sm opacity-60 dark:border-white/10">
        © {new Date().getFullYear()} {profile.name}
      </footer>
    </>
  );
}
