import Link from "next/link";
import { cookies } from "next/headers";
import { LMS_SESSION_COOKIE } from "@/middleware";
import { getCourses, countLessons, getAllProgress } from "@/lib/lms";

export const dynamic = "force-dynamic";

export default async function AssistentePage() {
  const sessionId = (await cookies()).get(LMS_SESSION_COOKIE)?.value;
  const progress = sessionId ? await getAllProgress(sessionId) : {};
  const courses = getCourses();

  return (
    <>
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">Assistente de Aprendizagem</h1>
        <p className="max-w-2xl leading-relaxed opacity-80">
          Sistema de gestão de aprendizagem com tutor de IA: escolha um curso,
          acompanhe seu progresso, converse com o tutor sobre cada lição e
          gere quizzes automáticos para testar o que aprendeu.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        {courses.map((course) => {
          const total = countLessons(course);
          const done = progress[course.id]?.length ?? 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Link
              key={course.id}
              href={`/assistente/cursos/${course.id}`}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-accent)]"
            >
              <h2 className="font-semibold">{course.title}</h2>
              <p className="text-sm leading-relaxed opacity-80">
                {course.description}
              </p>
              <div className="mt-auto flex flex-col gap-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs opacity-60">
                  {done}/{total} lições concluídas
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </>
  );
}
