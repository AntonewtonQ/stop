# Privacidade: web e mobile

Politica publica: https://jogastop.ao/privacidade

Responsaveis indicados pelo titular do projecto: **Antonewton Quima e Adilson Fernandes**.
Contacto publico de privacidade: **antonewtonquima@gmail.com**.

## Conteudo alinhado

- `lib/i18n/privacy.ts` descreve site/PWA e app nativa em PT/EN/FR.
- O mobile conserva o mesmo documento em `src/features/privacy/privacy.ts`
  no repositorio `stop-mobile`, disponivel sem carregar uma pagina remota.
- Manter as duas copias alinhadas quando mudar dados, fornecedores ou funcionalidades.
  A unica diferenca de codigo e o import do tipo `Locale`.
- A pagina do mobile tem um link para a politica publica; os links Google/Vercel
  aparecem apenas na seccao que explica os servicos web.

## O que foi confirmado no codigo

| Tema | Web/PWA | App nativa Android/iOS |
| --- | --- | --- |
| API de jogo | Salas, nomes, identificadores, respostas, votos, resultados, presenca | A mesma API e os mesmos tipos de dados |
| Sessao e preferencias | Armazenamento do navegador | Sessao/token no SecureStore; preferencias e codigo da ultima sala no AsyncStorage |
| Ranking publico | Nomes e estatisticas dos ultimos sete dias conservados | Partidas da app tambem podem alimentar o ranking web |
| Analytics | Vercel Web Analytics e eventos de desempenho/utilizacao | Sem SDK de analytics; continuam a existir registos da API |
| Publicidade | Integracao AdSense na pagina inicial | Sem AdSense, AdMob ou SDK publicitario |
| Permissoes nativas | Nao aplicavel | Funcionalidades nao pedem camera, microfone, contactos ou localizacao precisa |

O codigo da sala permite consultar informacoes da partida. Nao apresentar salas
como espacos confidenciais. As respostas da rodada em curso sao filtradas pela API
enquanto o relogio decorre; respostas e votos ficam visiveis nos resultados.

A app nativa migra sessoes antigas validas para SecureStore antes de remover a
copia no AsyncStorage. Falhas nao activam fallback para texto simples. No iOS, o
Keychain pode persistir apos desinstalar. Estas garantias nao se aplicam ao web.
A alteracao requer um novo build nativo; testes com mocks nao validam Keychain/Keystore.

## Retencao: configuracao, nao garantia operacional

- `ROOM_RETENTION_ACTIVE_HOURS`: 24 horas por defeito, para salas nao concluidas.
- `ROOM_RETENTION_FINISHED_HOURS`: 168 horas por defeito, para salas concluidas.
- Os limites consideram a ultima actualizacao. Salas com presenca recente nao sao removidas.
- A remocao depende da execucao bem-sucedida da limpeza oportunista ou da rota de manutencao.
- Reiniciar/deployar nao elimina a base de dados persistente. Limpar o dispositivo
  tambem nao elimina dados da API, metricas, logs ou backups de fornecedores.

## Antes de publicar ou submeter as lojas

- Testar o link `mailto:antonewtonquima@gmail.com` na seccao de pedidos e confirmar
  o acompanhamento da caixa de correio pelos responsaveis.
- Confirmar fornecedor da base de dados, regioes de alojamento, retencao configurada
  em producao e prazos dos logs/backups. Este documento nao confirma esses valores remotos.
- Verificar a limpeza em producao e definir quem trata pedidos de acesso/remocao.
  Nao existe botao de eliminacao imediata de dados no servidor.
- Confirmar a configuracao da CMP no AdSense, consentimento aplicavel e possibilidade
  de rever/retirar escolhas no site. Alterar a politica nao configura a CMP nem garante conformidade.
- Nas lojas, declarar o comportamento do binario nativo final, incluindo a API:
  nao seleccionar "nao recolhe dados" apenas por nao existir SDK de analytics.
- Nao transpor cookies/AdSense do site para a declaracao do app nativo. Rever novamente
  se forem adicionados SDKs de anuncios, analytics, crash reporting ou novas permissoes.
- Validar PT/EN/FR, acesso sem conta, links, textos com fonte ampliada e o URL publico
  apos o deploy. O deploy e a submissao nas lojas nao foram executados nesta alteracao.

Referencias oficiais:

- [Dados do utilizador no Google Play](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Privacidade do Vercel Web Analytics](https://vercel.com/docs/analytics/privacy-policy)
- [Consentimento de utilizadores da UE da Google](https://www.google.com/about/company/user-consent-policy/)
