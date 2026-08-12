import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { LMS_SESSION_COOKIE } from "@/middleware";
import { getLesson, getProgress } from "@/lib/lms";
import { LessonProgressToggle } from "@/components/assistente/lesson-progress-toggle";
import { QuizPanel } from "@/components/assistente/quiz-panel";
import { ChatWidget } from "@/components/assistente/chat-widget";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const found = getLesson(courseId, lessonId);
  if (!found) notFound();
  const { course, lesson } = found;

  const sessionId = (await cookies()).get(LMS_SESSION_COOKIE)?.value;
  const completed = sessionId ? await getProgress(sessionId, courseId) : [];
  const isDone = completed.includes(lessonId);

  return (
    <>
      <div>
        <Link
          href={`/assistente/cursos/${course.id}`}
          className="nav-link text-sm opacity-[.72] transition hover:opacity-100"
        >
          ← {course.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-[28px] font-semibold tracking-[-0.01em]">
            {lesson.title}
          </h1>
          <LessonProgressToggle
            courseId={course.id}
            lessonId={lesson.id}
            initialDone={isDone}
          />
        </div>
      </div>

      <article className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-[26px_28px] text-[15px] leading-[1.75] opacity-[.92]">
        {lesson.content}
      </article>

      <QuizPanel courseId={course.id} lessonId={lesson.id} />

      <ChatWidget courseContext={`Curso: ${course.title} / Lição: ${lesson.title}`} />
    </>
  );
}
