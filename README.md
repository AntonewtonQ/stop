# stop.ao

O `stop.ao` é uma versão online do clássico jogo Stop, criada em Angola para
jogar em grupo. Em cada rodada, os jogadores preenchem categorias com respostas
que começam pela letra sorteada antes que o tempo termine ou alguém grite STOP.

## Estado actual

O projecto já possui um MVP online jogável:

- landing page responsiva alinhada à identidade visual;
- interface disponível em português, inglês e francês;
- PWA instalável em Android, iPhone e computadores compatíveis;
- manifesto, ícones próprios e modo standalone;
- service worker com cache da interface e fallback offline;
- aviso de instalação adaptado para Android e iPhone;
- idioma escolhido individualmente e persistido no navegador;
- identificação do jogador pelo nome;
- escolha de avatar visual persistido na sessão e apresentado durante a partida;
- escolha de cor de perfil sincronizada entre jogadores;
- temas Clássico, Atlântico, Kizomba e Neon persistidos individualmente;
- criação de salas com código único;
- entrada numa sala existente por código ou convite;
- lobby sincronizado entre navegadores e dispositivos ligados ao mesmo servidor;
- presença online/offline sincronizada entre jogadores;
- recuperação automática da sessão após fechar e reabrir o navegador;
- aviso visual de ligação perdida com tentativa de reconexão;
- período de graça antes de marcar jogadores como offline;
- lista de jogadores e identificação do anfitrião;
- transferência automática do anfitrião e comandante quando ficam offline;
- configuração de categorias, duração e número de rodadas pelo anfitrião;
- ordem de comandantes definida pela entrada dos jogadores;
- número de rodadas automático pelo total de jogadores ou fixado entre `1` e
  `19` pelo anfitrião;
- rotação cíclica dos comandantes quando existem mais rodadas do que jogadores;
- escolha manual da letra pelo comandante corrente;
- bloqueio de letras já utilizadas;
- início sincronizado das rodadas;
- relógio regressivo e barra de progresso;
- persistência das respostas por jogador;
- botão STOP disponível para quem preencher todas as categorias;
- o primeiro STOP aceite termina a rodada para todos;
- encerramento automático quando o tempo termina;
- sons para início da rodada, últimos cinco segundos e STOP;
- controlo individual para activar ou desactivar sons;
- validação automática através de um léxico local por categoria;
- identificação de respostas duvidosas;
- votação sincronizada das respostas duvidosas pelos restantes jogadores;
- jogadores offline deixam de bloquear votações pendentes;
- recálculo automático da pontuação após cada decisão;
- bloqueio da próxima rodada enquanto existirem votações pendentes;
- cálculo de `0`, `5`, `10` e `20` pontos;
- resultados por categoria e jogador;
- classificação acumulada entre rodadas;
- início da rodada seguinte;
- classificação final apresentada automaticamente a todos no fim da partida;
- classificação final e revanche mantendo sala, regras e jogadores;
- convite directo para WhatsApp no lobby;
- estados para sala inexistente, entrada tardia e espera pelo comandante.
- API HTTP para todas as operações da partida;
- actualizações realtime através de Server-Sent Events;
- PostgreSQL/Neon em produção e SQLite local para salas, jogadores, rodadas,
  respostas e votos;
- limpeza automática e configurável de salas antigas;
- autorização das acções através de tokens privados de sessão.
- testes automatizados das regras, SQLite, APIs, SSE e fluxo multiplayer.
- Blueprint Render e health check preparados para publicação gratuita.

O validador é deliberadamente conservador: respostas presentes no léxico local
da categoria são aceites automaticamente; respostas que começam pela letra
correcta, mas ainda não constam do léxico, são enviadas para votação. O léxico
actual inclui uma base inicial em português, inglês e francês e pode ser
expandido em `lib/game/word-validation.ts`.

## Fluxo jogável

1. O jogador escreve o nome na página inicial.
2. Cria uma sala ou entra numa sala existente.
3. No lobby, o anfitrião configura categorias, tempo e número de rodadas.
4. Outros jogadores entram através do código ou convite.
5. O anfitrião, primeiro comandante activo, escolhe uma letra ainda não utilizada.
6. A escolha inicia a rodada e o relógio para todos.
7. Todos preenchem as respostas antes do tempo terminar.
8. O primeiro jogador a preencher tudo pode gritar STOP e encerrar a rodada
   para todos.
9. As respostas conhecidas são validadas automaticamente.
10. Os restantes jogadores votam nas respostas duvidosas.
11. A pontuação e a classificação são recalculadas após cada decisão.
12. O comando passa ao jogador seguinte, que escolhe uma nova letra.
13. A partida termina depois de completar o número de rodadas definido.
14. O anfitrião pode iniciar uma revanche com os mesmos jogadores.

## Testar localmente

Instala as dependências e inicia o servidor:

```bash
npm install
npm run dev
```

Depois:

1. Abre `http://localhost:3000`.
2. Escreve um nome e cria uma sala.
3. Copia o convite no lobby.
4. Abre o convite noutra aba e entra com outro nome.
5. Como anfitrião, prepara a partida e escolhe a primeira letra.

As salas sincronizam imediatamente jogadores, configurações, STOP, resultados,
votos e mudanças de rodada através de Server-Sent Events. As respostas ficam
privadas durante o relógio e são sincronizadas com os resultados após o STOP.
Para testar entre dispositivos, abre o endereço de rede apresentado pelo
`npm run dev`.

## Instalar no telemóvel

Em produção, o `stop.ao` pode ser instalado como aplicação:

- no Android/Chrome, usa o botão **Instalar** apresentado pela aplicação ou a
  opção **Instalar aplicação** do navegador;
- no iPhone/Safari, toca em **Partilhar** e depois em
  **Adicionar ao ecrã principal**;
- depois da instalação, o jogo abre em modo standalone, sem a barra do
  navegador.

O service worker guarda apenas a interface pública e recursos estáticos. As
APIs, salas e respostas nunca são guardadas em cache, preservando o estado
realtime da partida. Quando não existe ligação, a interface instalada abre e
mostra o estado de reconexão até a internet voltar.

## Backend e persistência

O backend utiliza Route Handlers do Next.js e escolhe a base de dados através
do ambiente:

- com `DATABASE_URL`, utiliza PostgreSQL/Neon;
- sem `DATABASE_URL`, utiliza SQLite nativo do Node em `data/stop.db`;
- jogadores, rodadas, respostas, desafios e votos possuem tabelas próprias;
- cada mutação é validada pelo servidor e executada numa transacção;
- no PostgreSQL, a sala é bloqueada durante cada mutação para evitar conflitos
  entre acções simultâneas;
- o esquema PostgreSQL é criado automaticamente na primeira ligação;
- tokens privados autorizam as acções e são guardados como hashes SHA-256;
- a identidade do jogador é guardada em `localStorage` e recuperada ao reabrir
  o navegador;
- o servidor publica notificações SSE imediatamente após cada alteração visível;
- o cliente recupera automaticamente o estado ao reconectar;
- a página inicial permite retomar a última sala guardada;
- cada sessão envia um heartbeat autenticado e entra num período de graça de
  `35` segundos antes de ficar offline;
- a janela de presença permite actualizar a página sem perder o comando;
- se o anfitrião ou comandante ficar offline, a liderança passa ao próximo
  jogador online sem devolver o controlo automaticamente ao reconectar;
- cada sala suporta até `19` jogadores, um por letra jogável;
- dispositivos e navegadores diferentes conseguem jogar através do mesmo servidor;
- actualizar a página mantém a sala e a sessão da aba;
- `STOP_DATABASE_PATH` permite definir outro caminho para o ficheiro SQLite;
- salas abandonadas são removidas após `24` horas e partidas concluídas após
  `168` horas, por padrão;
- salas com jogadores online recentes nunca são removidas pela limpeza.

O SQLite é adequado para desenvolvimento, demonstração e uma única instância do
servidor. O PostgreSQL/Neon é a persistência recomendada para produção.

## Publicar gratuitamente

A primeira beta pública pode ser publicada no **Render Free** como um único Web
Service Node.js. Esta opção é compatível com o broker SSE em memória porque não
escala para múltiplas instâncias.

1. Envia o repositório para o GitHub.
2. Cria uma conta em [Render](https://render.com/).
3. No dashboard, escolhe **New → Blueprint**.
4. Liga o repositório do `stop.ao`.
5. Cria um projecto gratuito na [Neon](https://neon.com/) e copia a connection
   string **pooled**, que contém `-pooler` no hostname.
6. Confirma o serviço definido em `render.yaml`, escolhe o plano **Free** e
   define `DATABASE_URL` com a connection string da Neon.
7. Depois do deploy, abre a URL `https://stop-ao.onrender.com` atribuída pelo
   Render.
8. Confirma o estado do servidor em `/api/health`.

O Blueprint executa `npm ci && npm run build`, inicia `npm run start`, utiliza
Node.js `24.14.1` e utiliza PostgreSQL quando `DATABASE_URL` estiver definida.

### Migrar para Neon

1. Na Neon, cria um projecto e selecciona uma região próxima do Render.
2. Abre **Connect**, activa **Pooled connection** e copia o URL PostgreSQL.
3. No Render, abre **Environment** e define `DATABASE_URL` com esse URL.
4. Confirma que `MAINTENANCE_SECRET` possui um valor longo e secreto.
5. Faz um novo deploy e abre `/api/health`; a primeira ligação cria o esquema e
   a resposta deverá apresentar `"database":"postgresql"`.
6. Cria uma sala de teste, faz outro deploy e confirma que a sala continua
   disponível.

Não coloques `DATABASE_URL` ou `MAINTENANCE_SECRET` no Git. O ficheiro
`.env.example` documenta as variáveis sem expor segredos.

As salas existentes no SQLite temporário do Render não são copiadas
automaticamente para a Neon. A activação causa um reset único das salas abertas;
as salas criadas depois disso passam a sobreviver a reinícios e deploys.

### Limpeza de salas antigas

A limpeza roda automaticamente durante o tráfego, no máximo uma vez a cada
`ROOM_CLEANUP_INTERVAL_MINUTES`. Para garantir limpeza mesmo sem visitas,
configura um serviço cron externo para enviar um `POST` periódico para:

```text
https://stop-ao.onrender.com/api/maintenance/cleanup
```

Com o cabeçalho:

```text
Authorization: Bearer <MAINTENANCE_SECRET>
```

Variáveis disponíveis:

- `ROOM_RETENTION_ACTIVE_HOURS=24` — retenção de salas abandonadas;
- `ROOM_RETENTION_FINISHED_HOURS=168` — retenção de partidas concluídas;
- `ROOM_CLEANUP_INTERVAL_MINUTES=15` — intervalo da limpeza oportunística.

### Limitações da beta gratuita

- o serviço pode adormecer depois de `15` minutos sem pedidos;
- o primeiro acesso após adormecer pode demorar cerca de um minuto;
- sem `DATABASE_URL`, o filesystem gratuito é temporário e reinícios apagam
  salas; com Neon, as salas persistem;
- partidas activas mantêm pedidos de presença, reduzindo a possibilidade de o
  serviço adormecer durante o jogo;
- depois da primeira visita, a PWA abre a interface guardada imediatamente e
  mostra o loading do `stop.ao` enquanto o serviço volta a responder;
- no primeiro acesso após o serviço adormecer, a página temporária do Render
  ainda pode aparecer porque é servida antes de o código da aplicação arrancar;
- o broker realtime funciona apenas numa instância.

Para múltiplas instâncias, ainda será necessário migrar o broker SSE em memória
para Redis/Pub/Sub, como Upstash Redis. Para eliminar completamente a página de
arranque do Render, é necessário usar uma instância que não adormeça ou alojar
o frontend separadamente num serviço sempre activo.

## API

- `POST /api/rooms` — cria uma sala;
- `GET /api/rooms/[code]` — carrega o estado público da sala;
- `POST /api/rooms/[code]/join` — adiciona um jogador;
- `POST /api/rooms/[code]/actions` — executa acções autenticadas da partida.
- `POST /api/rooms/[code]/presence` — actualiza presença e reconcilia liderança;
- `GET /api/rooms/[code]/events` — mantém o canal SSE realtime da sala.
- `GET /api/health` — valida o processo Node e a ligação à base de dados.
- `POST /api/maintenance/cleanup` — remove salas antigas com autorização Bearer.

As acções incluem configuração, início, escolha da letra, respostas, STOP,
votos, próxima rodada, fim da partida e revanche.

## Base de dados

O mesmo esquema é criado automaticamente em SQLite ou PostgreSQL:

- `rooms` — estado e configuração das salas;
- `players` — jogadores, ordem de entrada e tokens de sessão protegidos;
- `rounds` — letras, comandantes, relógio e resultados;
- `answers` — respostas e pontuação por categoria;
- `challenges` — respostas duvidosas;
- `votes` — votos individuais sobre respostas duvidosas.

## Regras de pontuação

- `0` — resposta vazia ou que não começa pela letra da rodada;
- `0` provisório — resposta duvidosa enquanto aguarda votação;
- `+20` — resposta correcta e única na categoria;
- `+10` — resposta correcta, com palavras diferentes das restantes;
- `+5` — resposta repetida por dois ou mais jogadores.

Jogadores não podem votar nas próprias respostas. A votação termina quando
todos os jogadores online elegíveis votam; a maioria aprova e um empate rejeita
a resposta. Quando não existe nenhum jogador elegível, a resposta é aprovada
automaticamente para não bloquear a partida.

## Comandantes e letras

- o criador da sala é o primeiro comandante enquanto permanecer online;
- a ordem seguinte respeita a ordem de entrada na sala;
- o comando roda entre os jogadores online até completar as rodadas definidas;
- jogadores offline são movidos na ordem ou substituídos por alguém online;
- o comandante escolhe a letra da rodada;
- qualquer jogador pode gritar STOP depois de preencher todas as categorias;
- o primeiro STOP aceite pelo servidor termina a rodada para todos;
- uma letra utilizada deixa de estar disponível durante a partida;
- por padrão, o número de rodadas acompanha o número de jogadores;
- o anfitrião pode fixar entre `1` e `19` rodadas antes de iniciar;
- quando há mais rodadas do que jogadores, a ordem de comando recomeça.

## Stack

- Next.js `16.2.7` com App Router
- React `19.2.4`
- Node.js `24` com SQLite nativo
- PostgreSQL/Neon em produção
- SQLite em desenvolvimento e testes
- TypeScript
- Tailwind CSS v4
- shadcn/ui `4.11.0`
- Radix UI
- Lucide React
- Sonner
- Vitest
- Playwright

O shadcn/ui utiliza o preset Nova. As primitivas acessíveis são personalizadas
pelos tokens visuais do `stop.ao`.

## Estrutura

```text
app/
  api/rooms/                Endpoints HTTP da partida
  page.tsx                 Página inicial
  sala/[code]/             Rota dinâmica da sala
  globals.css              Tokens globais e integração shadcn

components/
  brand/                   Logótipo e elementos da marca
  landing/                 Secções e interacções da landing page
  game/                    Lobby, jogadores, sala e primeira rodada
  ui/                      Primitivas shadcn/ui

lib/
  game/constants.ts        Categorias, tempos, letras e cores
  game/engine.ts           Regras puras executadas no servidor
  game/scoring.ts          Comparação e cálculo de pontuação
  game/storage.ts          Cliente HTTP e sessão privada da aba
  game/types.ts            Tipos do domínio
  game/use-room.ts         Sincronização reactiva via SSE
  game/word-validation.ts  Léxico local e normalização de respostas
  server/database.ts       Inicialização dos esquemas SQLite e PostgreSQL
  server/realtime.ts       Broker SSE por sala
  server/room-repository.ts Escolha e limpeza da persistência
  server/room-repository-postgres.ts Persistência PostgreSQL/Neon
  server/room-repository-sqlite.ts Persistência SQLite local
  server/room-view.ts      Visão pública/privada da sala
  utils.ts                 Utilitários partilhados

render.yaml                Blueprint gratuito para Render
```

## Identidade visual

- Azul petróleo: `#0F2D3D`
- Âmbar: `#F0B24A`
- Conceito: velocidade, categorias, competição e pontuação
- Tom: enérgico, simples e próximo

Os tokens visuais vivem em `app/globals.css`. O logótipo vetorial reutilizável
está em `components/brand/logo.tsx`.

## Comandos

```bash
npm run dev       # servidor de desenvolvimento
npm run lint      # ESLint
npm run test      # testes unitários e de integração com Vitest
npm run test:e2e  # fluxo multiplayer real em Chromium com Playwright
npm run test:all  # executa toda a suíte automatizada
npm run build     # build de produção com Webpack
npm run start     # executar o build de produção
npx tsc --noEmit  # validação TypeScript
```

## Testes automatizados

A suíte utiliza bases SQLite temporárias e nunca altera `data/stop.db`:

- `tests/game/` cobre pontuação, validação, letras, rodadas e comandantes;
- `tests/server/` cobre persistência, tokens, presença, Route Handlers e SSE;
- `e2e/` abre dois contextos de navegador e valida entrada por convite,
  sincronização realtime, transferência de anfitrião e início da rodada.

Antes da primeira execução E2E, instala o navegador do Playwright:

```bash
npx playwright install chromium
```

## Próximo marco

Evoluir o MVP online:

1. adicionar rate limiting e limites de payload;
2. migrar o broker SSE para Redis/Pub/Sub antes de usar múltiplas instâncias;
3. substituir o léxico inicial por um serviço de validação expansível;
4. criar histórico consultável de partidas e classificação;
5. permitir recuperar uma sessão noutro dispositivo;
6. adicionar autenticação opcional e perfis.

## Nota sobre Next.js

Este projecto utiliza Next.js 16, que possui diferenças importantes em relação
a versões anteriores. Antes de alterar APIs ou convenções do framework, consulta
os guias locais em `node_modules/next/dist/docs/`.
