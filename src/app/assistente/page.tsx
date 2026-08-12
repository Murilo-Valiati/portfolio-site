import Link from "next/link";
import { cookies } from "next/headers";
import { LMS_SESSION_COOKIE } from "@/middleware";
import { getCourses, countLessons, getAllProgress, getCustomModules } from "@/lib/lms";

export const dynamic = "force-dynamic";

export default async function AssistentePage() {
  const sessionId = (await cookies()).get(LMS_SESSION_COOKIE)?.value;
  const progress = sessionId ? await getAllProgress(sessionId) : {};
  const courses = getCourses();

  const customLessonCounts = Object.fromEntries(
    await Promise.all(
      courses.map(async (c) => {
        const modules = await getCustomModules(c.id);
        return [c.id, modules.reduce((sum, m) => sum + m.lessons.length, 0)] as const;
      })
    )
  );

  const categories = Array.from(new Set(courses.map((c) => c.category)));

  return (
    <>
      <section className="flex flex-col gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-[34px] font-semibold tracking-[-0.01em] sm:text-[40px]">
          Assistente de Aprendizagem
        </h1>
        <p className="max-w-2xl text-[15px] leading-[1.7] opacity-[.85]">
          Sistema de gestão de aprendizagem com tutor de IA: escolha um curso,
          acompanhe seu progresso, converse com o tutor sobre cada lição e
          gere quizzes automáticos para testar o que aprendeu.
        </p>
      </section>

      {categories.map((category) => (
        <section key={category} className="flex flex-col gap-6">
          <h2 className="inline-block font-[family-name:var(--font-display)] text-[22px] font-semibold">
            {category}
            <span className="mt-2.5 block h-0.5 w-9 rounded-full bg-[var(--color-accent)]" />
          </h2>
          <div className="grid gap-[22px] sm:grid-cols-2">
            {courses
              .filter((course) => course.category === category)
              .map((course) => {
                const total = countLessons(course) + (customLessonCounts[course.id] ?? 0);
                const done = progress[course.id]?.length ?? 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <Link
                    key={course.id}
                    href={`/assistente/cursos/${course.id}`}
                    className="hover-card flex flex-col gap-3.5 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-[26px_28px]"
                  >
                    <h3 className="font-[family-name:var(--font-display)] text-[17px] font-semibold">
                      {course.title}
                    </h3>
                    <p className="text-[14.5px] leading-[1.65] opacity-[.82]">
                      {course.description}
                    </p>
                    <div className="mt-auto flex flex-col gap-2">
                      <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                        <div
                          className="absolute inset-0 rounded-full transition-[width] duration-500 ease-out"
                          style={{
                            width: `${pct}%`,
                            background:
                              "linear-gradient(90deg, var(--color-accent), var(--color-accent-strong))",
                          }}
                        />
                      </div>
                      <span
                        className="text-[11px] text-[var(--color-muted)]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {done}/{total} lições concluídas
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
