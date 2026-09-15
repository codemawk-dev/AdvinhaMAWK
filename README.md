# AdvinhaMAWK

Jogo brasileiro de adivinhar músicas, com frontend React 19 e backend Fastify, Prisma e PostgreSQL. O frontend usa dados reais da API: sessão por cookie, partidas de 10 rodadas, quatro alternativas, trechos de áudio, pontuação, resultado e ranking.

A seleção mistura automaticamente os grupos musicais internos. O motor evita repetições recentes, controla o prazo e calcula os pontos no servidor. O catálogo contém 201 artistas configurados e a importação busca atingir pelo menos 5.000 músicas ativas com preview.

## Desenvolvimento

Requer Node.js 24 e PostgreSQL 17 ou superior.

```sh
npm ci
cp backend/.env.example backend/.env
docker compose up -d
npm run db:migrate
npm --prefix backend run db:seed
npm run catalog:sync
npm run dev
```

No PowerShell, use `Copy-Item backend/.env.example backend/.env` no lugar de `cp`. A importação consulta a Apple com intervalo entre chamadas e pode demorar. Ela é retomável e deduplica músicas.

Abra http://127.0.0.1:5173. O Vite encaminha `/api` para a API em `127.0.0.1:3000`. É necessário manter os dois processos rodando; `npm run dev` inicia ambos.

Sem Docker, `npm --prefix backend run db:local` inicia um PostgreSQL persistente em `backend/.local/postgres`. Use somente uma instância na porta configurada. Um PostgreSQL local já existente pode ser usado diretamente por `DATABASE_URL`.

## Supabase

As credenciais ficam exclusivamente em `backend/.env`. O frontend não precisa da chave secreta nem de uma conexão direta ao Supabase.

1. Configure `SUPABASE_URL` e `SUPABASE_DATABASE_URL` com a conexão completa do **Session pooler**, porta 5432, incluindo a senha codificada para URL.
2. Execute `npm --prefix backend run supabase:setup`. O comando valida o projeto, aplica migrations, transfere um catálogo local disponível e completa a importação até o mínimo configurado.
3. Inicie a API. Quando presente, `SUPABASE_DATABASE_URL` tem prioridade sobre `DATABASE_URL`.

Alternativa para preparar um banco vazio pelo SQL Editor: execute `backend/supabase/bootstrap.sql`, depois registre cada uma das três migrations com `prisma migrate resolve --applied NOME_DA_MIGRATION` antes de usar `migrate deploy`. Não execute o bootstrap em um banco que já contém as tabelas.

Com as tabelas prontas, `npm --prefix backend run supabase:transfer` transfere categorias, artistas e músicas do PostgreSQL local pela API de dados usando `SUPABASE_SECRET_KEY`. O comando preserva IDs já existentes e não copia jogadores ou partidas. Essa alternativa de carga não substitui a conexão PostgreSQL exigida pela API do jogo.

RLS e revogação de acesso direto protegem respostas, rodadas futuras e catálogo. Todo acesso do jogador passa pelo backend.

## Validação

```sh
npm run lint
npm run typecheck
npm run build
npm test
```

Os testes usam um PostgreSQL temporário isolado e FFmpeg real. Cobrem deduplicação do catálogo, pontuação, partidas completas, concorrência, pular rodada, isolamento entre jogadores, RLS e transferência idempotente. GitHub Actions executa os mesmos comandos em cada push e pull request.

## Execução em containers

`Dockerfile` gera o frontend servido pelo Nginx. `backend/Dockerfile` gera a API. `compose.app.yaml` inicia os dois com a API atrás de `/api`:

```sh
docker compose -f compose.app.yaml up --build -d
```

Abra http://127.0.0.1:8080. Configure previamente um PostgreSQL acessível pelo container (Supabase ou `host.docker.internal` para um banco no host), aplique as migrations e importe o catálogo. Para publicação, configure HTTPS no proxy de entrada, `NODE_ENV=production`, `JWT_SECRET` e `ADMIN_API_KEY` próprios. Não publique a porta da API diretamente; o proxy preserva o Host original para a proteção de origem.

## Estrutura e limites atuais

- `src/`: interface integrada, cliente HTTP e reprodução dos trechos.
- `backend/src/`: sessões, jogo, rankings, importação e áudio.
- `backend/prisma/`: modelo e migrations.
- `backend/README.md`: detalhes da API, critérios de seleção e operação do catálogo.

A sessão é de visitante, vinculada ao navegador por cookie de 30 dias. Retomar uma partida usa apenas seu ID no armazenamento local. Não há recuperação da conta em outro dispositivo. O modo duelo dos antigos protótipos ainda não possui suporte multiplayer e não aparece no fluxo integrado. A disponibilidade dos trechos depende da Apple; a interface permite tentar novamente ou pular uma rodada quando um trecho não carrega.
