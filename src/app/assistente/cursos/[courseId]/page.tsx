import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { LMS_SESSION_COOKIE } from "@/middleware";
import { getCourse, getCustomModules, getProgress } from "@/lib/lms";
import { CourseModules } from "@/components/assistente/course-modules";

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
  const customModules = await getCustomModules(courseId);

  return (
    <>
      <div>
        <Link href="/assistente" className="nav-link text-sm opacity-[.72] transition hover:opacity-100">
          ← Todos os cursos
        </Link>
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
    </>
  );
}
