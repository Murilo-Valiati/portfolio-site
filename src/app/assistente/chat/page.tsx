import { ChatWidget } from "@/components/assistente/chat-widget";

export default function AssistenteChatPage() {
  return (
    <>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold tracking-[-0.01em]">
          Tutor de IA
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-[1.7] opacity-[.85]">
          Converse livremente com o tutor sobre qualquer um dos temas dos
          cursos, ou peça sugestões do que estudar a seguir.
        </p>
      </div>
      <ChatWidget />
    </>
  );
}
