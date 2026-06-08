# stop.ao

O `stop.ao` é uma versão online do clássico jogo Stop, feita para jogar em
grupo. Em cada rodada, os jogadores preenchem categorias com respostas que
começam pela letra definida pelo comandante da rodada.

## Pontuação

- `+20` — resposta correcta e única na categoria
- `+10` — resposta correcta, com outros jogadores também a acertarem
- `+5` — resposta repetida por dois ou mais jogadores

## Identidade visual

- Azul petróleo: `#0F2D3D`
- Âmbar: `#F0B24A`
- Conceito: velocidade, categorias, competição e pontuação
- Tom: enérgico, simples e próximo

Os tokens visuais globais vivem em `app/globals.css`. O logótipo vetorial
reutilizável está em `components/brand/logo.tsx`.

## Estrutura

- `components/brand` — activos e componentes da marca
- `components/landing` — secções e interacções da página inicial
- `components/ui` — primitivas shadcn/ui
- `lib/utils.ts` — utilitários partilhados, incluindo `cn`

O shadcn/ui está configurado com Radix, preset Nova e Tailwind CSS v4. A
identidade visual do `stop.ao` continua definida pelos tokens da marca.

## Desenvolvimento

```bash
npm run dev
npm run lint
npm run build
```

O projecto usa Next.js 16 com App Router. Antes de alterar convenções do
framework, consulta os guias locais em `node_modules/next/dist/docs/`.
