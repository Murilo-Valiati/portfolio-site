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
  reabrir = tentar de novo) e `erro` (3 falhas técnicas). Cair em
  aguardando/erro dispara Pushover normal na hora. O painel pode CORRIGIR o
  texto de uma nota (PATCH com `{text}`, só com sessão — chave não reescreve
  texto), o que a devolve pra fila zerada (limpa interpretação e evento).
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

# Endurecimento (auditoria 2026-08-30)

- `src/proxy.ts` substitui o middleware deprecado do Next 16 (mesma lógica);
  `LMS_SESSION_COOKIE`/`DAILY_LOG_PATH` moraram para `lib/session.ts`.
- Login com freio de força bruta em memória (5 falhas → bloqueio exponencial
  até 15 min por IP). `SESSION_SECRET` ausente em produção derruba a sessão
  com erro em vez de usar o fallback de dev.
- `poweredByHeader: false`; headers de segurança (HSTS etc.) no Caddyfile da
  EC2. Manifest PWA: instalar o site na tela de início abre `/admin/hoje` em
  tela cheia.
- Backup do /data: cron diário na EC2 (`/etc/cron.daily/backup-app-data`)
  guarda 14 dias de tar.gz em /opt/backups — proteção contra corrupção e
  exclusão acidental; ainda não cobre perda da instância (S3 pendente de IAM).
