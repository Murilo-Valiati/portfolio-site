import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLesson,
  getLessonWithCustom,
  getProgress,
  getQuizResults,
} from "@/lib/lms";
import { LessonProgressToggle } from "@/components/assistente/lesson-progress-toggle";
import { QuizPanel } from "@/components/assistente/quiz-panel";
import { ChatWidget } from "@/components/assistente/chat-widget";
import { LessonContentEditor } from "@/components/assistente/lesson-content-editor";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const found = await getLessonWithCustom(courseId, lessonId);
  if (!found) notFound();
  const { course, lesson } = found;
  const hasContent = lesson.content.trim().length > 0;
  const isCustomLesson = !getLesson(courseId, lessonId);

  const completed = await getProgress(courseId);
  const isDone = completed.includes(lessonId);

  const resultados = (await getQuizResults(courseId))[lessonId] ?? [];
  const ultimo = resultados[resultados.length - 1] ?? null;

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

      {hasContent ? (
        <article className="whitespace-pre-wrap rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-[26px_28px] text-[15px] leading-[1.75] opacity-[.92]">
          {lesson.content}
        </article>
      ) : (
        <p className="rounded-[14px] border border-dashed border-[var(--color-border)] p-[26px_28px] text-[14.5px] opacity-70">
          Lição personalizada, ainda sem conteúdo. Escreva o material abaixo pra
          liberar o quiz — ou use o chat pra estudar o assunto.
        </p>
      )}

      {isCustomLesson && (
        <LessonContentEditor
          courseId={course.id}
          lessonId={lesson.id}
          initialContent={lesson.content}
        />
      )}

      {hasContent && (
        <QuizPanel
          courseId={course.id}
          lessonId={lesson.id}
          ultimoInicial={ultimo}
        />
      )}

      <ChatWidget
        courseContext={`Curso: ${course.title} / Lição: ${lesson.title}`}
        threadKey={`${course.id}:${lesson.id}`}
      />
    </>
  );
}
