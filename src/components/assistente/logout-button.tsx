"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="shrink-0 text-sm opacity-80 transition hover:opacity-100 hover:text-[var(--color-accent)]"
    >
      Sair
    </button>
  );
}
