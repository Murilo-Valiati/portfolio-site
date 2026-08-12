import { ChatWidget } from "@/components/assistente/chat-widget";

export default function AssistenteChatPage() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Tutor de IA</h1>
        <p className="mt-2 max-w-2xl leading-relaxed opacity-80">
          Converse livremente com o tutor sobre qualquer um dos temas dos
          cursos, ou peça sugestões do que estudar a seguir.
        </p>
      </div>
      <ChatWidget />
    </>
  );
}
