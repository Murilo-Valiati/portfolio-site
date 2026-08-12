import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/assistente/logout-button";

export const metadata: Metadata = {
  title: "Assistente de Aprendizagem | Murilo Valiati",
  description: "Sistema de gestão de aprendizagem com tutor de IA.",
};

const nav = [
  { href: "/assistente", label: "Cursos" },
  { href: "/assistente/chat", label: "Tutor" },
];

export default function AssistenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/assistente" className="shrink-0 font-semibold">
            Assistente de Aprendizagem
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <nav className="no-scrollbar flex gap-4 overflow-x-auto text-sm sm:gap-6">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 opacity-80 transition hover:opacity-100 hover:text-[var(--color-accent)]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/"
                className="shrink-0 opacity-80 transition hover:opacity-100 hover:text-[var(--color-accent)]"
              >
                ← Portfólio
              </Link>
              <LogoutButton />
            </nav>
            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-12">
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] px-6 py-6 text-center text-sm opacity-60">
        Demonstração de IA integrada ao portfólio de Murilo Valiati.
      </footer>
    </>
  );
}
