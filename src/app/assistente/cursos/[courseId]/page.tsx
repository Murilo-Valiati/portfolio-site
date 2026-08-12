import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { LMS_SESSION_COOKIE } from "@/middleware";
import { getCourse, getProgress } from "@/lib/lms";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourse(courseId);
  if (!course) notFound();

  const sessionId = (await cookies()).get(LMS_SESSION_COOKIE)?.value;
  const completed = sessionId ? await getProgress(sessionId, courseId) : [];

  return (
    <>
      <div>
        <Link
          href="/assistente"
          className="text-sm opacity-70 transition hover:opacity-100 hover:text-[var(--color-accent)]"
        >
          ← Todos os cursos
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{course.title}</h1>
        <p className="mt-2 max-w-2xl leading-relaxed opacity-80">
          {course.description}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {course.modules.map((mod) => (
          <section key={mod.id} className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">{mod.title}</h2>
            <div className="flex flex-col gap-2">
              {mod.lessons.map((lesson) => {
                const done = completed.includes(lesson.id);
                return (
                  <Link
                    key={lesson.id}
                    href={`/assistente/cursos/${course.id}/${lesson.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition hover:border-[var(--color-accent)]"
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
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
