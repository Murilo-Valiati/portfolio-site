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
          className="text-sm opacity-70 transition hover:opacity-100 hover:text-[var(--color-accent)]"
        >
          ← {course.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          <LessonProgressToggle
            courseId={course.id}
            lessonId={lesson.id}
            initialDone={isDone}
          />
        </div>
      </div>

      <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 leading-relaxed opacity-90">
        {lesson.content}
      </article>

      <QuizPanel courseId={course.id} lessonId={lesson.id} />

      <ChatWidget courseContext={`Curso: ${course.title} / Lição: ${lesson.title}`} />
    </>
  );
}
