"use client";

import { useState } from "react";
import Link from "next/link";
import type { Module } from "@/lib/lms";

function ModuleSection({
  courseId,
  mod,
  completedLessons,
  isCustom,
  onRemoveModule,
  onLessonAdded,
}: {
  courseId: string;
  mod: Module;
  completedLessons: string[];
  isCustom: boolean;
  onRemoveModule?: (moduleId: string) => void;
  onLessonAdded?: (moduleId: string, title: string) => void;
}) {
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAddLesson() {
    const title = lessonTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    await onLessonAdded?.(mod.id, title);
    setSaving(false);
    setLessonTitle("");
    setAddingLesson(false);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {mod.title}
        </h2>
        {isCustom && onRemoveModule && (
          <button
            type="button"
            onClick={() => onRemoveModule(mod.id)}
            className="text-xs text-red-400 hover:underline"
          >
            Remover módulo
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {mod.lessons.map((lesson) => {
          const done = completedLessons.includes(lesson.id);
          return (
            <Link
              key={lesson.id}
              href={`/assistente/cursos/${courseId}/${lesson.id}`}
              className="hover-card flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <span>{lesson.title}</span>
              {done && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs text-[var(--rich-black)]"
                  style={{ background: "var(--color-accent-soft)" }}
                >
                  Concluída
                </span>
              )}
            </Link>
          );
        })}
        {mod.lessons.length === 0 && (
          <p className="text-sm opacity-60">Nenhuma lição ainda.</p>
        )}
      </div>

      {isCustom && (
        <div>
          {addingLesson ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLesson()}
                placeholder="Nome da lição"
                className="flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
              />
              <button
                type="button"
                onClick={handleAddLesson}
                disabled={saving || !lessonTitle.trim()}
                className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm text-[var(--rich-black)] disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingLesson(true)}
              className="self-start text-sm text-[var(--color-accent)] hover:underline"
            >
              + Adicionar lição
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function CourseModules({
  courseId,
  builtinModules,
  initialCustomModules,
  completedLessons,
}: {
  courseId: string;
  builtinModules: Module[];
  initialCustomModules: Module[];
  completedLessons: string[];
}) {
  const [customModules, setCustomModules] = useState<Module[]>(initialCustomModules);
  const [addingModule, setAddingModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAddModule() {
    const title = moduleTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    const res = await fetch("/api/assistente/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, title }),
    });
    const data = await res.json();
    if (res.ok) setCustomModules(data.modules);
    setSaving(false);
    setModuleTitle("");
    setAddingModule(false);
  }

  async function handleRemoveModule(moduleId: string) {
    const res = await fetch("/api/assistente/modules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, moduleId }),
    });
    const data = await res.json();
    if (res.ok) setCustomModules(data.modules);
  }

  async function handleLessonAdded(moduleId: string, title: string) {
    const res = await fetch("/api/assistente/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, moduleId, title }),
    });
    const data = await res.json();
    if (res.ok) setCustomModules(data.modules);
  }

  return (
    <div className="flex flex-col gap-8">
      {builtinModules.map((mod) => (
        <ModuleSection
          key={mod.id}
          courseId={courseId}
          mod={mod}
          completedLessons={completedLessons}
          isCustom={false}
        />
      ))}

      {customModules.map((mod) => (
        <ModuleSection
          key={mod.id}
          courseId={courseId}
          mod={mod}
          completedLessons={completedLessons}
          isCustom
          onRemoveModule={handleRemoveModule}
          onLessonAdded={handleLessonAdded}
        />
      ))}

      <div className="rounded-[14px] border border-dashed border-[var(--color-border)] p-5">
        {addingModule ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
              placeholder="Ex: Módulo que estou estudando agora"
              className="flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="button"
              onClick={handleAddModule}
              disabled={saving || !moduleTitle.trim()}
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm text-[var(--rich-black)] disabled:opacity-50"
            >
              Adicionar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingModule(true)}
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            + Adicionar módulo que estou estudando
          </button>
        )}
      </div>
    </div>
  );
}
