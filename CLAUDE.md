@AGENTS.md

# Agenda por voz (worker interno)

O subsistema de notas (`/admin/notas` + `/api/notas`) tem um worker interno que
substitui a antiga automação externa (Claude Cowork + Reclaim + Toki):

- `src/lib/interprete.ts` — Gemini (JSON mode) transforma a nota ditada em ação
  estruturada. Datas relativas resolvem pelo `createdAt` DA NOTA, nunca pela
  hora da execução. Não relaxar as regras do prompt: cada uma veio de erro real.
- `src/lib/google-calendar.ts` — Google Calendar via service account (JWT
  assinado com o `jose`; sem dependência nova). Envs: `GOOGLE_SA_EMAIL`,
  `GOOGLE_SA_PRIVATE_KEY_B64`, `GOOGLE_CALENDAR_ID`. Sem elas o worker fica
  inerte e o site se comporta como antes (fila pendente pro Cowork).
- `src/lib/agenda-worker.ts` — pipeline: interpretar → guardas em código
  (horário no passado NUNCA escorrega de dia → "aguardando"; dedup por adoção
  de evento; só marca "processado" depois de reler o evento no Google) →
  3 tentativas → "erro" com aviso. A fila nunca para em silêncio.
- `src/lib/discador.ts` — avisa 15 min antes de evento com `ligar`. Canal
  preferido: Pushover em prioridade emergência (`PUSHOVER_TOKEN` +
  `PUSHOVER_USER`), que repete até ser confirmado e fura o silencioso.
  Alternativa: ligação Twilio (`TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM` +
  `DISCADOR_PARA`). Dormante sem envs; enquanto dormante, o sufixo
  " - Me Ligue" no título mantém o Toki funcionando.
- `src/lib/agenda-cron.ts` + `src/instrumentation.ts` — setInterval no processo
  (container único): fila 5/5 min, discador 1/1 min. Notas novas também
  disparam a fila na hora via `after()` na rota.
- Estados da nota: `pendente` → `processado`; `aguardando` (precisa do dono;
  reabrir = tentar de novo) e `erro` (3 falhas técnicas).
- Bancada dev: `GET /api/notas/teste-interpretacao?texto=...&criadaEm=...`
  (404 em produção).
- `src/lib/rotina.ts` — resumo matinal (7h, todo dia) e revisão semanal
  (domingo 20h) via Pushover prioridade normal, com estado em
  /data/rotina.json (1 envio/dia, sobrevive a reinício; primeira execução
  semeia sem enviar). Disparo manual: `GET /api/rotina/testar?tipo=resumo|
  revisao&key=NOTES_KEY` (fora de /api/admin de propósito — o middleware
  exigiria sessão).
- `/admin/hoje` — página do dia: agenda (Google), notas em atenção com
  "tentar de novo", hábitos com toggle (API do tracker), botão de ditar.
- Compatibilidade: os endpoints do Cowork (GET com `?key=`, mutação via GET em
  `/processar`) continuam intactos DE PROPÓSITO durante a transição. Não
  remover sem confirmar que a automação externa foi desligada.
