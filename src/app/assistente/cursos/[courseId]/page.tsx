import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { LMS_SESSION_COOKIE } from "@/middleware";
import { findAnyCourse, getCustomModules, getProgress, isCustomCourseId } from "@/lib/lms";
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

  const sessionId = (await cookies()).get(LMS_SESSION_COOKIE)?.value;
  const completed = sessionId ? await getProgress(sessionId, courseId) : [];
  const customModules = await getCustomModules(courseId);

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

      <ChatWidget
        courseContext={`Curso: ${course.title} — ${course.description}`}
        threadKey={`${course.id}:geral`}
      />
    </>
  );
}
