# AdvinhaSong — backend

Backend de um jogo de adivinhação de músicas brasileiras. Cada partida mistura automaticamente artistas, estilos e épocas; o jogador informa apenas a quantidade de rodadas. Sem frontend nesta etapa.

## Executar

Requisitos: Node.js 22.13+ (validado com 24), npm, Docker Compose e acesso à internet para a primeira importação e para o áudio. O FFmpeg é instalado por `ffmpeg-static`; `FFMPEG_PATH` permite usar outro binário.

```sh
# PowerShell: Copy-Item .env.example .env
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npm run catalog:sync
npm run dev
```

A API escuta em `http://127.0.0.1:3000`. O Compose sobe PostgreSQL 17 com volume persistente e porta restrita ao localhost. `migrate dev` aplica a migration inicial e executa o seed de artistas. `catalog:sync` também garante o seed, de forma idempotente.

O comando `catalog:sync` processa lotes de até nove artistas até confirmar pelo menos 5.000 músicas ativas de artistas ativos. Uma carga inicial pode levar vários minutos. Use `--batch` para executar somente um lote. Não é necessário importar os 201 artistas para iniciar uma partida. Se alguma consulta falhar, repita o sync: os artistas seguintes continuam elegíveis. Se houver poucos títulos, `POST /games` retorna `409 CATALOG_TOO_SMALL` com a orientação de importar músicas.

```sh
npm run catalog:sync -- --all  # Todos os artistas elegíveis, em lotes; pode demorar vários minutos
npm run catalog:sync -- --min-songs 5000  # Meta explícita, baseada em músicas gravadas
npm run catalog:sync -- --batch # Apenas um lote
npm run db:seed               # Apenas artistas; sem consultas Apple
```

O seed contém **201 artistas únicos, em nove grupos administrativos**. `CATALOG_MIN_SONGS` define a meta padrão (5.000). Contam apenas músicas ativas de artistas ativos; atualizações e duplicatas não inflam essa contagem. Se faltarem artistas elegíveis antes da meta, o comando termina com erro e informa o motivo. A lista está em `src/catalog/artists.ts`. Ele não sobrescreve ajustes feitos pelo administrador e não copia arquivos de áudio.

## Fluxo completo de uma partida

Exemplo PowerShell. Crie uma sessão uma vez e reutilize seu token, inclusive em partidas posteriores, para preservar o histórico recente:

```powershell
$api = 'http://127.0.0.1:3000'
$session = Invoke-RestMethod "$api/sessions" -Method Post -ContentType 'application/json' -Body '{"displayName":"Mateus"}'
$headers = @{ Authorization = "Bearer $($session.accessToken)" }
$game = Invoke-RestMethod "$api/games" -Method Post -Headers $headers -ContentType 'application/json' -Body '{"rounds":10}'
$round = Invoke-RestMethod "$api/games/$($game.gameId)/round" -Headers $headers
$round.options | Format-Table
```

`previewUrl` é uma rota relativa da própria API. O frontend deve requisitá-la com o mesmo cookie de sessão (mesma origem) ou com o token Bearer e reproduzir a resposta `audio/mpeg`. **Não é a URL da Apple.** Não salve o preview em arquivo ou cache. O servidor entrega um trecho limitado a 1, 3, 5, 10 ou 15 segundos, sem título ou artista nos metadados.

Escolha uma alternativa e envie seu ID:

```powershell
# Troque [0] pelo índice escolhido pelo jogador.
$body = @{ roundId = $round.roundId; answerId = $round.options[0].id } | ConvertTo-Json
$answer = Invoke-RestMethod "$api/games/$($game.gameId)/answer" -Method Post -Headers $headers -ContentType 'application/json' -Body $body
$answer
# Repita GET /round e POST /answer até completed=true.
$round = Invoke-RestMethod "$api/games/$($game.gameId)/round" -Headers $headers
# Depois de responder às 10 rodadas:
Invoke-RestMethod "$api/games/$($game.gameId)/result" -Headers $headers
Invoke-RestMethod "$api/rankings/daily"
```

Também é possível começar com `POST /games` sem corpo e sem sessão. A API cria uma sessão anônima, retorna `accessToken` e grava um cookie HttpOnly/SameSite=Strict. Reutilize esse token ou cookie nos próximos pedidos. JWT inválido não cria uma nova identidade. A sessão dura 30 dias; autenticação de contas e recuperação de acesso ficam para uma próxima etapa.

Exemplo de rodada:

```json
{
  "roundId": "UUID",
  "previewUrl": "/games/UUID/rounds/UUID/audio",
  "duration": 5,
  "deadline": "2026-09-14T20:00:00.000Z",
  "options": [{ "id": "UUID", "title": "Título" }]
}
```

Na resposta real há quatro alternativas. Os IDs pertencem à rodada, sem vínculo público com IDs de músicas. `correctAnswer` aparece somente depois de uma resposta válida. Nesse momento, inclui título, artista, capa e link para a Apple Music.

O prazo é de 60 segundos a partir do primeiro `GET /round`. Consultar novamente mantém o horário original e as mesmas opções. Após o prazo, enviar uma opção válida registra zero pontos e avança; isso permite continuar uma partida mesmo após uma rodada perdida. A partida inteira expira após uma hora. Apenas o trecho atual fica disponível; o recorte pode ter aproximadamente um frame de tolerância devido ao encoder MP3.

## Rotas

| Método | Rota | Uso |
|---|---|---|
| GET | `/health` | Saúde da API e conexão com banco; 503 quando indisponível |
| POST | `/sessions` | Sessão anônima; `displayName` opcional |
| POST | `/games` | `{ "rounds": 10 }` ou corpo vazio; 1–20 rodadas |
| GET | `/games/:gameId` | Progresso, pontuação e estado; sem respostas |
| GET | `/games/:gameId/round` | Abre ou recupera a rodada atual |
| GET | `/games/:gameId/rounds/:roundId/audio` | Trecho protegido da rodada atual |
| POST | `/games/:gameId/answer` | `{ "roundId": "UUID", "answerId": "UUID" }` |
| GET | `/games/:gameId/result` | Resultado da partida concluída |
| GET | `/rankings` | Alias do ranking geral |
| GET | `/rankings/daily` | Melhor partida de cada jogador no dia |
| GET | `/rankings/weekly` | Melhor partida de cada jogador na semana |
| GET | `/rankings/all-time` | Melhor partida de cada jogador no histórico |

Categorias, artistas, dificuldade, duração e score enviados em corpos de partidas são rejeitados por schemas Zod estritos. Erros têm `{ error, message }`, com `issues` para validação. Sessão ausente: 401; partida alheia: 404; rodada inválida, já respondida ou futura: 409; partida expirada: 410; rate limit: 429.

## Administração

Todas as rotas `/admin/*` exigem `X-Admin-Key`, definido por `ADMIN_API_KEY`. Troque os segredos de exemplo antes de expor o serviço. O modo produção rejeita os valores de desenvolvimento e usa cookie Secure.

| Método | Rota | Uso |
|---|---|---|
| POST | `/admin/catalog/sync` | Executa um lote; retorna contagens ou `busy: true` |
| GET | `/admin/catalog/status` | Quantidades, artistas pendentes, erros e bloqueio ativo |
| GET | `/admin/categories` | Grupos internos disponíveis |
| GET | `/admin/songs?page=1&limit=50` | Catálogo paginado, máximo 100 por página |
| PATCH | `/admin/songs/:id` | Ajusta `popularityWeight`, `difficultyWeight`, `originalYear`, `active` |
| GET | `/admin/artists?page=1&limit=50` | Artistas e diagnóstico de sincronização |
| POST | `/admin/artists` | Cadastra artista brasileiro para importação |
| PATCH | `/admin/artists/:id` | Atualiza artista e agenda nova consulta |

Exemplo de cadastro:

```json
{
  "name": "Nome do artista",
  "categoryId": "mpb",
  "aliases": ["Nome alternativo exato"],
  "catalogPriority": 3,
  "active": true
}
```

`appleArtistId` pode ser definido explicitamente como string numérica. Quando houver homônimos, a importação exige resolução administrativa; não usa aproximação textual para aceitar tributos ou artistas parecidos. A identificação automática exige um único ID entre resultados de nome exato/alias. A origem brasileira é uma decisão da lista editorial, não uma inferência de `country=BR` (que significa a loja consultada).

`popularityWeight` vai de 0,2 a 5; `difficultyWeight`, de 0,8 a 1,2. Títulos reconhecíveis listados em `src/catalog/curation.ts` começam com popularidade 3 e dificuldade 0,9; os demais começam neutros (1). A sincronização preserva ajustes editoriais existentes. Eles são **editoriais**, não métricas de sucesso fornecidas pela Apple. O endpoint permite calibrá-los conforme playtests e curadoria. `originalYear` corrige reedições que aparecem com datas recentes; sem esse ajuste, usa-se `releaseDate`, que pode ser a data da edição. Desativar um artista o exclui de novas partidas. `Song.active` representa disponibilidade e pode ser restaurado pela sincronização; não é uma exclusão editorial permanente.

## Catálogo e scheduler

Fluxo: `ITunesClient → CatalogService → repositórios → PostgreSQL → GameService`. Não há consultas de pesquisa/lookup durante partidas; somente o áudio é transmitido pelo provedor quando solicitado.

- Busca usa `country=BR`, `media=music`, `entity=song`, `attribute=artistTerm` e `limit=200`.
- Chamadas são serializadas com intervalo de 4 segundos, timeout de 15 segundos, até três tentativas para rede/429/5xx, backoff e `Retry-After` limitado a um minuto.
- Scheduler considera `nextSyncAt`, processa até nove artistas e espera 60 segundos entre lotes. Atualização normal: sete dias; falha: uma hora.
- Um lease persistido no PostgreSQL impede lotes simultâneos entre API, CLI e worker. Expira após dez minutos, é renovado durante o processamento e liberado no final. Não há avalanche de requisições após uma falha.
- `appleTrackId` é único; `artistId + normalizedTitle` também. A versão de estúdio substitui a versão ao vivo mantendo o ID interno e ajustes editoriais. Remixes, karaokês, tributos e versões instrumentais são filtrados por heurística.
- Ausência em busca não desativa uma música. Uma resposta explícita sem preview desativa o track conhecido. Músicas sem verificação por 30 dias são consultadas via lookup em lotes de até 50 IDs; somente um lookup bem-sucedido autoriza marcar ausências como indisponíveis.
- O normalizador remove marcadores reconhecidos de versão e participação. Mantém o título original e parênteses que fazem parte dele, como “Não Quero Dinheiro (Só Quero Amar)”.

O scheduler já vem ativo na API. Para executá-lo separadamente:

```sh
# Configure SCHEDULER_ENABLED=false na API.
npm run catalog:worker
```

Em operação distribuída, use um worker de catálogo e uma instância de áudio inicialmente. O rate limiting HTTP e a fila de áudio são locais ao processo; Redis e uma fila distribuída são os próximos passos quando houver múltiplas réplicas. O lease não é um substituto para uma fila de alta disponibilidade com fencing.

## Seleção, pontuação e ranking

A seleção ponderada penaliza repetição de categoria, década e músicas das últimas 20 partidas do mesmo jogador. Tenta no máximo duas músicas por grupo e um artista por partida, relaxando restrições quando o catálogo exige. Nunca repete um título normalizado dentro da partida. Alternativas favorecem o mesmo grupo, período próximo e artista, preservando quatro títulos distintos.

O tamanho mínimo do catálogo é `max(4, rounds)` títulos distintos. Mais artistas e épocas tornam a seleção melhor. O pool inicial é lido do PostgreSQL em memória; um catálogo muito maior deverá usar amostragem por estratos no repositório. `GameService` não depende da Apple.

Base por duração: 1 s = 1000; 3 s = 850; 5 s = 700; 10 s = 500; 15 s = 300. Acerto recebe até 20% de bônus de velocidade, considerando o tempo após a duração do áudio, e multiplicador editorial de dificuldade. Streak: 3 = 1,05×; 5 = 1,10×; 7 = 1,20×; 10 = 1,30×. Erro ou tempo esgotado zera o streak e rende zero. Todos os valores são calculados no servidor e gravados na mesma transação.

O ranking considera somente partidas concluídas de **10 rodadas**, com duas rodadas de cada duração, e usa a melhor pontuação por jogador. Isso evita vantagens pelo tamanho escolhido. Dia e semana seguem `America/Sao_Paulo`; a semana começa na segunda-feira. Retorna até 100 jogadores. Como as músicas são sorteadas e a identidade ainda é anônima, o ranking é casual; competição formal exigirá contas, controles de abuso e desafios comparáveis.

## Estrutura e decisões

```text
src/
  app.ts                    composição e tratamento global de erros
  server.ts                 servidor e encerramento ordenado
  core/                     configuração, autenticação, erros, sorteio
  catalog/                  Apple, normalização, artistas, sync, scheduler, admin
  games/                    seleção, distractors, score, transações, rotas
  audio/                    AudioProvider e ApplePreviewProvider
  rankings/                 períodos e consulta agregada
prisma/                     schema, migration SQL e seed
scripts/smoke-live.ts        teste opcional com Apple real
tests/                      testes unitários, API, PostgreSQL e FFmpeg
```

Fastify 5, TypeScript estrito, Prisma 6.19.2, Zod 4 e PostgreSQL. Prisma e client estão fixados na mesma versão para manter o fluxo clássico `migrate dev`; mudanças de major devem ser feitas em conjunto. `effect` e `deepmerge-ts` têm overrides corrigidos para a cadeia de ferramentas Prisma, validados por geração e migrations. O lockfile registra as versões efetivamente testadas.

Modelo acrescenta `RoundOption` para IDs opacos e `CatalogLease` para sincronização. As rodadas guardam snapshots da música, áudio, duração, dificuldade e alternativas: uma atualização do catálogo não altera uma partida existente. O repository usa `SELECT ... FOR UPDATE` na partida antes de abrir rodada ou registrar resposta. A constraint única de `PlayerAnswer.roundId` é uma proteção adicional; a FK composta impede associar uma opção de outra rodada.

Os serviços são compostos por injeção simples em `buildApp`. Trocar `AudioProvider` substitui a origem de áudio sem mudar o Game Engine. Repositórios concentram os acessos de domínio e permitem acrescentar cache de catálogo/ranking depois. Consultas administrativas simples ficam no controller para evitar camadas sem comportamento.

## Validação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
```

`npm test` inicia um PostgreSQL **real e isolado**, em porta temporária, aplica as migrations e remove o banco ao terminar. Não depende de Docker e não acessa seu banco de desenvolvimento. Requer poder iniciar processos locais e consultar o usuário do sistema. O pacote de teste usa PostgreSQL 18; o Compose usa PostgreSQL 17, ambos compatíveis com o SQL utilizado. Em Linux, execute com usuário comum: PostgreSQL não inicia como root.

A suíte cobre normalização, diversidade, alternativas, score, períodos, throttling, validação Apple, corte de áudio, remoção de metadados, acesso indevido, respostas futuras/duplicadas/simultâneas, catálogo e partida completa. Testes normais usam respostas Apple simuladas e não fazem chamadas externas.

Para verificar integração externa deliberadamente (até nove buscas, mais o áudio da primeira rodada):

```sh
npm run test:live
```

Esse teste usa banco temporário, importa artistas/músicas reais, reproduz o primeiro trecho na camada de áudio, responde às dez rodadas com a primeira opção e confere o resultado. Não salva os previews e não preserva esse catálogo: use `catalog:sync` para popular seu banco de desenvolvimento. Depende da disponibilidade da Apple.

## Uso dos previews e fontes

A implementação é um protótipo técnico. Os termos da Apple restringem previews a promoção do conteúdo e vedam valor de entretenimento independente; **nem o desenvolvimento de um protótipo deve ser tratado como licença automática para este uso**. Avalie os termos e obtenha autorização/provedor licenciado antes de disponibilizar o jogo. O proxy/corte não remove essas restrições. A implementação mantém apenas buffers transitórios necessários à transmissão, sem arquivos de áudio, cache persistente ou redirects para o cliente.

- [Apple — termos e visão geral da Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html)
- [Apple — parâmetros e limites da busca](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html)
- [Prisma — migrations de desenvolvimento e produção](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production)
- [Ecad — repertório e execuções de Rita Lee](https://www4.ecad.org.br/noticias/nota-de-pesar-rita-lee/)
- [Ecad — repertório e execuções de Tim Maia](https://www4.ecad.org.br/noticias/25-anos-sem-tim-maia/)
- [Ecad — Gonzaguinha, obras mais tocadas e regravadas](https://www4.ecad.org.br/noticias/ecad-celebra-os-80-anos-de-gonzaguinha-com-ranking-de-suas-musicas-mais-tocadas-e-regravadas/)

A ampliação da lista combina a seleção original com curadoria entre gerações, apoiada nesses levantamentos. Não representa um ranking oficial dos 201 artistas. Covers por artistas legítimos, músicas obscuras, homônimos e datas de reedição ainda exigem revisão editorial; a API não oferece dados suficientes para resolver todos esses casos automaticamente.


## Verificação realizada nesta entrega

- Lint, TypeScript estrito, build e validação Prisma executados com sucesso.
- Testes automatizados com PostgreSQL temporário e FFmpeg real, incluindo migrations, concorrência e transferência do catálogo.
- Teste externo em 14/09/2026: 201 artistas cadastrados; lote de nove artistas importou 915 músicas ativas nos nove grupos; áudio de 1 segundo respondeu HTTP 200; partida real de dez rodadas concluída.
- `npm audit`: zero vulnerabilidades na árvore instalada após atualização das ferramentas e overrides.
- Docker não estava instalado no ambiente desta implementação. O Compose foi fornecido; a execução do contêiner PostgreSQL 17 precisa ser validada no ambiente com Docker. O banco e o catálogo do teste externo eram temporários e foram removidos ao terminar.



## Supabase e catálogo persistente

O backend aceita `SUPABASE_DATABASE_URL` no `.env`. Quando presente, essa conexão tem prioridade sobre `DATABASE_URL` para o servidor, o Prisma, o seed e a importação. Use conexão direta ou **Session pooler, porta 5432**, com senha PostgreSQL codificada para URL. As chaves `sb_secret_…` e `sb_publishable_…` autenticam a API HTTP; não substituem a senha do PostgreSQL nem permitem criar tabelas por SQL.

```sh
npm run supabase:setup
```

O comando verifica o projeto de destino, aplica migrations sem reset, transfere categorias, artistas e músicas do banco local quando disponível, cadastra todos os artistas configurados e completa a meta de 5.000 músicas. A transferência é repetível e preserva registros já existentes. Jogadores, sessões, respostas e partidas locais não são transferidos. Os segredos ficam apenas no `.env`, excluído do controle de versão.

Uma migration habilita RLS e revoga acesso direto das funções `anon` e `authenticated` às tabelas de backend. Isso impede que a chave pública consulte respostas corretas ou rodadas futuras pela Data API. O jogo continua acessando os dados pelo backend Fastify. A conexão PostgreSQL desse backend deve usar uma função com os privilégios necessários e bypass de RLS, como a conexão administrativa usada na configuração; não crie políticas públicas de leitura para as tabelas de rodada.

Sem Docker, o PostgreSQL persistente de desenvolvimento pode ser iniciado com:

```sh
npm run db:local
# Em outro terminal, enquanto db:local permanece aberto:
npx prisma migrate deploy
npm run catalog:sync
# Para parar, preservando os dados:
npm run db:local:stop
```

Os dados ficam em `.local/postgres`; não remova essa pasta para preservar o catálogo. `db:local` usa `DATABASE_URL` local, mesmo quando o Supabase é o destino do backend. Não execute Docker e o banco local na mesma porta ao mesmo tempo. Testes usam bancos temporários separados e desabilitam explicitamente a conexão Supabase.

Verificação da ampliação: **5.536 músicas jogáveis**, **201 artistas cadastrados**, nove grupos administrativos, persistidos no PostgreSQL local. A existência desse catálogo local não significa que a transferência ao Supabase foi concluída; ela exige acesso SQL ao projeto correto.
