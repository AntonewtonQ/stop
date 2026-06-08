# stop.ao

O `stop.ao` é uma versão online do clássico jogo Stop, criada em Angola para
jogar em grupo. Em cada rodada, os jogadores preenchem categorias com respostas
que começam pela letra sorteada antes que o tempo termine ou alguém grite STOP.

## Estado actual

O projecto já possui um MVP local jogável:

- landing page responsiva alinhada à identidade visual;
- identificação do jogador pelo nome;
- criação de salas com código único;
- entrada numa sala existente por código ou convite;
- lobby sincronizado entre abas do mesmo navegador;
- lista de jogadores e identificação do anfitrião;
- configuração de categorias e duração pelo anfitrião;
- início sincronizado da primeira rodada;
- sorteio da letra inicial;
- relógio regressivo e barra de progresso;
- preenchimento e validação visual das respostas;
- botão STOP para guardar as respostas;
- estados para sala inexistente, entrada tardia e espera pelo anfitrião.

As respostas ainda não são comparadas entre jogadores e a pontuação ainda não é
calculada no final da rodada.

## Fluxo jogável

1. O jogador escreve o nome na página inicial.
2. Cria uma sala ou entra numa sala existente.
3. No lobby, o anfitrião configura categorias e tempo.
4. Outros jogadores entram através do código ou convite.
5. O anfitrião inicia a primeira rodada.
6. Todos preenchem as respostas antes do tempo terminar.
7. O jogador pode guardar as respostas com o botão STOP.

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
5. Configura a sala como anfitrião e inicia a rodada.

As abas sincronizam jogadores, configurações e o início da rodada.

## Persistência actual

Este MVP ainda não utiliza backend:

- as salas são guardadas em `localStorage`;
- a identidade do jogador é guardada em `sessionStorage`;
- o evento `storage` sincroniza salas entre abas;
- uma sala só existe no navegador onde foi criada;
- dispositivos e navegadores diferentes ainda não conseguem jogar juntos;
- actualizar a página mantém a sala e a sessão da aba.

Esta camada local foi isolada para ser substituída posteriormente por base de
dados e comunicação realtime.

## Regras de pontuação planeadas

- `+20` — resposta correcta e única na categoria;
- `+10` — resposta correcta, com palavras diferentes das restantes;
- `+5` — resposta repetida por dois ou mais jogadores.

## Stack

- Next.js `16.2.7` com App Router
- React `19.2.4`
- TypeScript
- Tailwind CSS v4
- shadcn/ui `4.11.0`
- Radix UI
- Lucide React
- Sonner

O shadcn/ui utiliza o preset Nova. As primitivas acessíveis são personalizadas
pelos tokens visuais do `stop.ao`.

## Estrutura

```text
app/
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
  game/storage.ts          Persistência e operações locais da sala
  game/types.ts            Tipos do domínio
  game/use-room.ts         Sincronização reactiva da sala
  utils.ts                 Utilitários partilhados
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
npm run build     # build de produção com Turbopack
npm run start     # executar o build de produção
npx tsc --noEmit  # validação TypeScript
```

## Próximo marco

Transformar o protótipo local num jogo multiplayer real:

1. adicionar backend, base de dados e realtime;
2. persistir respostas por jogador e rodada;
3. parar a rodada para todos quando alguém gritar STOP;
4. comparar e validar respostas;
5. calcular `+5`, `+10` e `+20`;
6. mostrar resultados, classificação e iniciar novas rodadas;
7. suportar reconexão e mudança de anfitrião.

## Nota sobre Next.js

Este projecto utiliza Next.js 16, que possui diferenças importantes em relação
a versões anteriores. Antes de alterar APIs ou convenções do framework, consulta
os guias locais em `node_modules/next/dist/docs/`.
