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
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-background)]/[.82] backdrop-blur-[8px]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-[18px] sm:px-7">
          <Link
            href="/assistente"
            className="shrink-0 font-[family-name:var(--font-display)] text-[19px] font-semibold tracking-[0.01em]"
          >
            Assistente de Aprendizagem
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-6">
            <nav className="no-scrollbar flex gap-4 overflow-x-auto text-sm sm:gap-[30px]">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-link shrink-0 opacity-[.72] transition hover:opacity-100"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/"
                className="nav-link shrink-0 opacity-[.72] transition hover:opacity-100"
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

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-4 py-12 sm:px-7">
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] px-6 py-7 text-center text-[13px] text-[var(--color-muted)]">
        Demonstração de IA integrada ao portfólio de Murilo Valiati.
      </footer>
    </>
  );
}
