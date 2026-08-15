import type { Metadata } from "next";
import { getAllEntries } from "@/lib/daily-log";
import { DailyLogForm } from "@/components/daily-log-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log do Dia",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DailyLogPage() {
  const entries = await getAllEntries();

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "32px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#111",
        background: "#fff",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
        Log do Dia
      </h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>
        Diário pessoal — treino, estudo, alimentação, sono, humor, tela e
        outros hábitos.
      </p>

      <DailyLogForm />

      <hr style={{ margin: "32px 0", border: "none", borderTop: "1px solid #ddd" }} />

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
        Últimos registros
      </h2>

      {entries.length === 0 && (
        <p style={{ fontSize: 13, color: "#888" }}>Nenhum registro ainda.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {entries.map((entry) => (
          <li
            key={entry.id}
            style={{ border: "1px solid #e5e5e5", borderRadius: 6, padding: 12 }}
          >
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
              {new Date(entry.date).toLocaleString("pt-BR")}
            </div>
            <div style={{ fontSize: 14, whiteSpace: "pre-wrap", marginBottom: entry.tags.length ? 8 : 0 }}>
              {entry.text}
            </div>
            {entry.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      background: "#f0f0f0",
                      borderRadius: 999,
                      padding: "2px 8px",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
