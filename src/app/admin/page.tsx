"use client";

import { useRouter } from "next/navigation";

const removeBtnClass =
  "self-start rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-red-400 hover:border-red-400";

const blocks = [
  {
    href: "/admin/conteudo",
    title: "Administrativo",
    description:
      "Edite a bio, foto de perfil, skills, experiência, projetos, idiomas e contatos do site.",
  },
  {
    href: "/assistente",
    title: "Assistente de IA",
    description:
      "Acesse os cursos, converse com o tutor de IA e gere quizzes sobre as lições.",
  },
];

export default function AdminHubPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="min-h-full flex-1 bg-[var(--color-background)] px-6 py-10 text-[var(--color-foreground)]">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold">
            Painel do usuário
          </h1>
          <button onClick={handleLogout} className={removeBtnClass}>
            Sair
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {blocks.map((block) => (
            <a
              key={block.href}
              href={block.href}
              className="hover-card flex flex-col gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-[26px_28px]"
            >
              <h2 className="font-[family-name:var(--font-display)] text-[19px] font-semibold">
                {block.title}
              </h2>
              <p className="text-[14.5px] leading-[1.65] opacity-[.82]">
                {block.description}
              </p>
              <span className="mt-auto pt-2 text-sm text-[var(--color-accent)]">
                Acessar →
              </span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
