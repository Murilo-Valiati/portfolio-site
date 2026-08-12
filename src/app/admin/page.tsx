"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteContent } from "@/lib/content";

const inputClass =
  "rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]";
const labelClass = "flex flex-col gap-1 text-sm";
const cardClass =
  "flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6";
const removeBtnClass =
  "self-start rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-red-400 hover:border-red-400";
const addBtnClass =
  "self-start rounded-md border border-[var(--color-accent)] px-3 py-1.5 text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--rich-black)] transition";

export default function AdminDashboard() {
  const router = useRouter();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [tagsDrafts, setTagsDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/content")
      .then((res) => res.json())
      .then((data: SiteContent) => {
        setContent(data);
        setTagsDrafts(
          Object.fromEntries(data.projects.map((p) => [p.id, p.tags.join(", ")]))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function parseTags(raw: string): string[] {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function handleSave() {
    if (!content) return;
    setSaving(true);
    setMessage(null);
    const contentToSave: SiteContent = {
      ...content,
      projects: content.projects.map((project) => ({
        ...project,
        tags:
          tagsDrafts[project.id] !== undefined
            ? parseTags(tagsDrafts[project.id])
            : project.tags,
      })),
    };
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contentToSave),
    });
    setSaving(false);
    setContent(contentToSave);
    setMessage(res.ok ? "Alterações salvas com sucesso." : "Erro ao salvar.");
  }

  async function handleAvatarUpload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (res.ok && content) {
      setContent({ ...content, profile: { ...content.profile, avatarUrl: data.url } });
    } else {
      setMessage(data.error || "Erro ao enviar imagem.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (loading || !content) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center bg-[var(--color-background)] text-[var(--color-foreground)]">
        Carregando…
      </main>
    );
  }

  return (
    <main className="min-h-full flex-1 bg-[var(--color-background)] px-6 py-10 text-[var(--color-foreground)]">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Painel administrativo</h1>
          <div className="flex items-center gap-3">
            <a
              href="/assistente"
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Assistente IA →
            </a>
            <button onClick={handleLogout} className={removeBtnClass}>
              Sair
            </button>
          </div>
        </div>

        {/* Perfil */}
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Perfil</h2>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[var(--color-accent)] text-lg font-semibold text-[var(--rich-black)]">
              {content.profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={content.profile.avatarUrl}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                content.profile.avatarInitials
              )}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Foto de perfil
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
                className="text-xs"
              />
              {uploading && <span className="text-xs opacity-70">Enviando…</span>}
            </label>
          </div>

          <label className={labelClass}>
            Nome
            <input
              className={inputClass}
              value={content.profile.name}
              onChange={(e) =>
                setContent({
                  ...content,
                  profile: { ...content.profile, name: e.target.value },
                })
              }
            />
          </label>

          <label className={labelClass}>
            Nome curto (cabeçalho do site)
            <input
              className={inputClass}
              maxLength={10}
              value={content.profile.shortName}
              onChange={(e) =>
                setContent({
                  ...content,
                  profile: { ...content.profile, shortName: e.target.value },
                })
              }
            />
          </label>

          <label className={labelClass}>
            Iniciais do avatar (fallback)
            <input
              className={inputClass}
              maxLength={3}
              value={content.profile.avatarInitials}
              onChange={(e) =>
                setContent({
                  ...content,
                  profile: { ...content.profile, avatarInitials: e.target.value },
                })
              }
            />
          </label>

          <label className={labelClass}>
            Título / cargo
            <input
              className={inputClass}
              value={content.profile.title}
              onChange={(e) =>
                setContent({
                  ...content,
                  profile: { ...content.profile, title: e.target.value },
                })
              }
            />
          </label>

          <label className={labelClass}>
            Selo de status (ao lado do cargo — deixe vazio pra ocultar)
            <input
              className={inputClass}
              value={content.profile.statusPill}
              onChange={(e) =>
                setContent({
                  ...content,
                  profile: { ...content.profile, statusPill: e.target.value },
                })
              }
            />
          </label>

          <label className={labelClass}>
            Bio
            <textarea
              className={`${inputClass} min-h-24`}
              value={content.profile.bio}
              onChange={(e) =>
                setContent({
                  ...content,
                  profile: { ...content.profile, bio: e.target.value },
                })
              }
            />
          </label>
        </section>

        {/* Experiência */}
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Experiência</h2>
          {content.experience.map((item, i) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-4"
            >
              <label className={labelClass}>
                Cargo / função
                <input
                  className={inputClass}
                  value={item.role}
                  onChange={(e) => {
                    const experience = [...content.experience];
                    experience[i] = { ...experience[i], role: e.target.value };
                    setContent({ ...content, experience });
                  }}
                />
              </label>
              <label className={labelClass}>
                Empresa / contexto
                <input
                  className={inputClass}
                  value={item.place}
                  onChange={(e) => {
                    const experience = [...content.experience];
                    experience[i] = { ...experience[i], place: e.target.value };
                    setContent({ ...content, experience });
                  }}
                />
              </label>
              <label className={labelClass}>
                Período (ex: 2023 - Atual)
                <input
                  className={inputClass}
                  value={item.period}
                  onChange={(e) => {
                    const experience = [...content.experience];
                    experience[i] = { ...experience[i], period: e.target.value };
                    setContent({ ...content, experience });
                  }}
                />
              </label>
              <label className={labelClass}>
                Descrição
                <textarea
                  className={`${inputClass} min-h-16`}
                  value={item.description}
                  onChange={(e) => {
                    const experience = [...content.experience];
                    experience[i] = { ...experience[i], description: e.target.value };
                    setContent({ ...content, experience });
                  }}
                />
              </label>
              <button
                onClick={() =>
                  setContent({
                    ...content,
                    experience: content.experience.filter((_, idx) => idx !== i),
                  })
                }
                className={removeBtnClass}
              >
                Remover experiência
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setContent({
                ...content,
                experience: [
                  ...content.experience,
                  {
                    id: `experiencia-${Date.now()}`,
                    role: "",
                    place: "",
                    period: "",
                    description: "",
                  },
                ],
              })
            }
            className={addBtnClass}
          >
            + Adicionar experiência
          </button>
        </section>

        {/* Skills */}
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {content.skills.map((skill, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  className={`${inputClass} w-32`}
                  value={skill}
                  onChange={(e) => {
                    const skills = [...content.skills];
                    skills[i] = e.target.value;
                    setContent({ ...content, skills });
                  }}
                />
                <button
                  onClick={() =>
                    setContent({
                      ...content,
                      skills: content.skills.filter((_, idx) => idx !== i),
                    })
                  }
                  className={removeBtnClass}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setContent({ ...content, skills: [...content.skills, ""] })}
            className={addBtnClass}
          >
            + Adicionar skill
          </button>
        </section>

        {/* Projetos */}
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Projetos</h2>
          {content.projects.map((project, i) => (
            <div
              key={project.id}
              className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-4"
            >
              <label className={labelClass}>
                Título
                <input
                  className={inputClass}
                  value={project.title}
                  onChange={(e) => {
                    const projects = [...content.projects];
                    projects[i] = { ...projects[i], title: e.target.value };
                    setContent({ ...content, projects });
                  }}
                />
              </label>
              <label className={labelClass}>
                Descrição
                <textarea
                  className={`${inputClass} min-h-16`}
                  value={project.description}
                  onChange={(e) => {
                    const projects = [...content.projects];
                    projects[i] = { ...projects[i], description: e.target.value };
                    setContent({ ...content, projects });
                  }}
                />
              </label>
              <label className={labelClass}>
                Tags (separadas por vírgula)
                <input
                  className={inputClass}
                  value={tagsDrafts[project.id] ?? project.tags.join(", ")}
                  onChange={(e) =>
                    setTagsDrafts({ ...tagsDrafts, [project.id]: e.target.value })
                  }
                  onBlur={(e) => {
                    const projects = [...content.projects];
                    projects[i] = { ...projects[i], tags: parseTags(e.target.value) };
                    setContent({ ...content, projects });
                  }}
                />
              </label>
              <label className={labelClass}>
                Link do projeto
                <input
                  className={inputClass}
                  value={project.link}
                  onChange={(e) => {
                    const projects = [...content.projects];
                    projects[i] = { ...projects[i], link: e.target.value };
                    setContent({ ...content, projects });
                  }}
                />
              </label>
              <label className={labelClass}>
                Link do repositório
                <input
                  className={inputClass}
                  value={project.repo}
                  onChange={(e) => {
                    const projects = [...content.projects];
                    projects[i] = { ...projects[i], repo: e.target.value };
                    setContent({ ...content, projects });
                  }}
                />
              </label>
              <button
                onClick={() => {
                  setContent({
                    ...content,
                    projects: content.projects.filter((_, idx) => idx !== i),
                  });
                  const drafts = { ...tagsDrafts };
                  delete drafts[project.id];
                  setTagsDrafts(drafts);
                }}
                className={removeBtnClass}
              >
                Remover projeto
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const id = `projeto-${Date.now()}`;
              setContent({
                ...content,
                projects: [
                  ...content.projects,
                  {
                    id,
                    title: "Novo projeto",
                    description: "",
                    tags: [],
                    link: "#",
                    repo: "#",
                  },
                ],
              });
              setTagsDrafts({ ...tagsDrafts, [id]: "" });
            }}
            className={addBtnClass}
          >
            + Adicionar projeto
          </button>
        </section>

        {/* Idiomas */}
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Idiomas</h2>
          {content.languages.map((language, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={`${inputClass} flex-1`}
                value={language.name}
                onChange={(e) => {
                  const languages = [...content.languages];
                  languages[i] = { ...languages[i], name: e.target.value };
                  setContent({ ...content, languages });
                }}
              />
              <input
                type="number"
                min={0}
                max={100}
                className={`${inputClass} w-24`}
                value={language.level}
                onChange={(e) => {
                  const languages = [...content.languages];
                  languages[i] = {
                    ...languages[i],
                    level: Math.min(100, Math.max(0, Number(e.target.value))),
                  };
                  setContent({ ...content, languages });
                }}
              />
              <button
                onClick={() =>
                  setContent({
                    ...content,
                    languages: content.languages.filter((_, idx) => idx !== i),
                  })
                }
                className={removeBtnClass}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setContent({
                ...content,
                languages: [...content.languages, { name: "", level: 0 }],
              })
            }
            className={addBtnClass}
          >
            + Adicionar idioma
          </button>
        </section>

        {/* Contato */}
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Contato</h2>
          <label className={labelClass}>
            Email
            <input
              className={inputClass}
              value={content.contact.email}
              onChange={(e) =>
                setContent({
                  ...content,
                  contact: { ...content.contact, email: e.target.value },
                })
              }
            />
          </label>
          <label className={labelClass}>
            LinkedIn
            <input
              className={inputClass}
              value={content.contact.linkedin}
              onChange={(e) =>
                setContent({
                  ...content,
                  contact: { ...content.contact, linkedin: e.target.value },
                })
              }
            />
          </label>
          <label className={labelClass}>
            GitHub
            <input
              className={inputClass}
              value={content.contact.github}
              onChange={(e) =>
                setContent({
                  ...content,
                  contact: { ...content.contact, github: e.target.value },
                })
              }
            />
          </label>
          <label className={labelClass}>
            WhatsApp (link wa.me)
            <input
              className={inputClass}
              value={content.contact.whatsapp}
              onChange={(e) =>
                setContent({
                  ...content,
                  contact: { ...content.contact, whatsapp: e.target.value },
                })
              }
            />
          </label>
        </section>

        <div className="sticky bottom-4 flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-[var(--color-accent)] px-5 py-2 font-semibold text-[var(--rich-black)] transition disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          {message && <span className="text-sm opacity-80">{message}</span>}
        </div>
      </div>
    </main>
  );
}
