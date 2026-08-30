import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findAnyCourse,
  getCustomModules,
  getProgress,
  getQuizResults,
  isCustomCourseId,
} from "@/lib/lms";
import { CourseModules } from "@/components/assistente/course-modules";
import { ChatWidget } from "@/components/assistente/chat-widget";
import { DeleteCourseButton } from "@/components/assistente/delete-course-button";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await findAnyCourse(courseId);
  if (!course) notFound();

  const completed = await getProgress(courseId);
  const customModules = await getCustomModules(courseId);

  // Desempenho nos quizzes, pra revisão: última nota por lição.
  const resultados = await getQuizResults(courseId);
  const todasLicoes = [...course.modules, ...customModules].flatMap((m) => m.lessons);
  const desempenho = todasLicoes
    .map((l) => {
      const tentativas = resultados[l.id] ?? [];
      const ultima = tentativas[tentativas.length - 1];
      return ultima
        ? { titulo: l.title, ultima, tentativas: tentativas.length }
        : null;
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-3">
          <Link href="/assistente" className="nav-link text-sm opacity-[.72] transition hover:opacity-100">
            ← Todos os cursos
          </Link>
          {isCustomCourseId(course.id) && <DeleteCourseButton courseId={course.id} />}
        </div>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[32px] font-semibold tracking-[-0.01em]">
          {course.title}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-[1.7] opacity-[.85]">
          {course.description}
        </p>
      </div>

      <CourseModules
        courseId={course.id}
        builtinModules={course.modules}
        initialCustomModules={customModules}
        completedLessons={completed}
      />

      {desempenho.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-semibold">Desempenho nos quizzes</h2>
          <ul className="flex flex-col gap-2">
            {desempenho.map((d) => (
              <li
                key={d.titulo}
                className="flex flex-wrap items-baseline justify-between gap-2 text-[14px]"
              >
                <span>{d.titulo}</span>
                <span
                  className="text-[12px] text-[var(--color-muted)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {d.ultima.score}/{d.ultima.total} ·{" "}
                  {new Date(d.ultima.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}{" "}
                  · {d.tentativas} {d.tentativas > 1 ? "tentativas" : "tentativa"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ChatWidget
        courseContext={`Curso: ${course.title} — ${course.description}`}
        threadKey={`${course.id}:geral`}
      />
    </>
  );
}
