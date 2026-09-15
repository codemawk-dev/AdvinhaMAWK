# AdvinhaMAWK — backend

API Fastify, Prisma e PostgreSQL integrada ao frontend React na raiz do repositório. Consulte o README principal para iniciar os dois serviços.

## Desenvolvimento

Use Node.js 24. Na raiz, execute `npm ci`, configure `backend/.env`, inicie o PostgreSQL e execute `npm run db:migrate`, `npm --prefix backend run db:seed`, `npm run catalog:sync` e `npm run dev`.

Sem Docker, `npm run db:local` neste diretório inicia PostgreSQL persistente em `.local/postgres`. `LOCAL_POSTGRES_DIR` permite reutilizar outro diretório. Mantenha esse processo aberto; `npm run db:local:stop` encerra sem apagar o catálogo. Não inicie duas instâncias na mesma porta. FFmpeg é instalado por `ffmpeg-static`; `FFMPEG_PATH` permite outro binário.

## Partida e busca

O frontend cria uma sessão de visitante com cookie HttpOnly/SameSite=Strict. A sessão dura 30 dias; partidas duram até 24 horas e podem ser retomadas. Não há cronômetro por rodada ou bônus por velocidade de resposta.

Cada música começa com 0,1 segundo. Errar ou pedir mais áudio libera 0,5, 2, 8 e finalmente 15 segundos. O jogador digita pelo menos dois caracteres para buscar músicas por título ou artista, sem distinção de acentos. A busca retorna até 15 sugestões reais do catálogo. A resposta correta só aparece ao acertar ou esgotar as cinco pistas.

| Método | Rota | Uso |
|---|---|---|
| GET | `/health` | Saúde da API e banco |
| POST | `/sessions` | Sessão; `displayName` opcional |
| GET | `/catalog/search?q=amor` | Sugestões com `id`, `title`, `artist` |
| POST | `/games` | `{ "rounds": 10 }`; aceita 1–20 rodadas |
| GET | `/games/:id` | Progresso e pontuação |
| GET | `/games/:id/round` | Prepara e recupera a pista atual |
| GET | `/games/:id/rounds/:roundId/audio?attempt=0&revision=0` | Somente áudio atual autorizado |
| POST | `/games/:id/answer` | Palpite ou pedido de próxima pista |
| GET | `/games/:id/result` | Resultado concluído |
| GET | `/rankings/daily`, `/rankings/weekly`, `/rankings/all-time` | Melhores partidas de 10 músicas |

Exemplo da pista atual:

```json
{
  "roundId": "UUID",
  "previewUrl": "/games/UUID/rounds/UUID/audio?attempt=0&revision=0",
  "duration": 0.1,
  "attempt": 0,
  "revision": 0,
  "clues": [0.1, 0.5, 2, 8, 15],
  "guesses": [],
  "replaced": false
}
```

Envie `{ "roundId": "UUID", "songId": "UUID_DA_BUSCA", "attempt": 0, "revision": 0 }`. `songId: null` pede mais áudio. `roundFinished: false` mantém a mesma música e libera a próxima pista; consulte `/round` novamente. Quando `roundFinished: true`, a resposta inclui `correctAnswer`; `completed: true` indica o fim da partida.

Os pontos base são 1200, 1000, 750, 450 e 200 conforme a pista do acerto, com multiplicador por sequência de acertos. O servidor calcula tudo. O ranking considera a melhor partida concluída de 10 músicas por visitante nas regras atuais, com períodos em America/Sao_Paulo. A identidade anônima torna esse ranking casual.

Transações bloqueiam a partida antes de registrar palpites. Pedidos duplicados, pistas antigas, tentativas de ouvir trechos futuros e partidas alheias são rejeitados. `GuessAttempt` preserva o histórico por revisão; uma troca de áudio não desconta tentativas. Partidas anteriores à migração progressiva continuam armazenadas, mas não podem ser retomadas nem entram no ranking atual.

## Áudio e disponibilidade

O servidor verifica e prepara 15 segundos antes de abrir a rodada. Remove silêncio inicial, ajusta os timestamps e entrega WAV mono sem metadados, com a duração exata da pista. Não envia ao cliente a URL original ou o áudio das próximas pistas.

Um cache de memória limitado a 32 MB, com validade de 15 minutos, compartilha o preparo entre pedidos da mesma fonte. Não há armazenamento persistente de áudio. Downloads têm limites de tamanho, prazo, concorrência e redirecionamento para domínios Apple autorizados.

Falhas permanentes colocam a música em quarentena por 24 horas e provocam substituição por outra disponível, preservando pontos e pistas. Falhas temporárias permitem tentar novamente. Nenhum provedor externo oferece disponibilidade absoluta; a interface informa recuperação sem descontar palpite por falha de carregamento.

`npm run catalog:audit-audio` verifica uma música por artista importado e todas as fontes em quarentena. Fontes que passam são liberadas novamente. O comando consulta o provedor real e informa disponíveis, indisponíveis e falhas temporárias.

## Catálogo e administração

O seed cadastra 201 artistas em nove grupos editoriais. `npm run catalog:sync` importa até atingir 5.000 músicas ativas, deduplicando títulos e preservando ajustes editoriais. `--all` processa todos os artistas elegíveis; `--batch` limita a um lote; `--min-songs 5000` define a meta. A importação é retomável. Artistas cadastrados não significam artistas já importados.

O scheduler usa lease no banco para evitar importações concorrentes. `SCHEDULER_ENABLED=false` desativa a execução automática. Pesquisas de palpites usam o PostgreSQL; não fazem pesquisa externa durante a partida.

Rotas `/admin/*` exigem `X-Admin-Key` configurada em `ADMIN_API_KEY`:

- `POST /admin/catalog/sync` e `GET /admin/catalog/status`: sincronização e diagnóstico.
- `GET /admin/categories`, `/admin/songs`, `/admin/artists`: listagem; músicas e artistas aceitam paginação.
- `PATCH /admin/songs/:id`: popularidade, dificuldade, ano original e atividade.
- `POST /admin/artists` e `PATCH /admin/artists/:id`: cadastro e curadoria de artistas.

Popularidade é um peso editorial, não uma métrica Apple. A identificação exige nome/alias exato e resolução administrativa de homônimos. Datas de reedições e músicas pouco reconhecíveis ainda exigem curadoria. Desativar artista exclui suas músicas de novas partidas.

## Supabase

`SUPABASE_DATABASE_URL` tem prioridade sobre `DATABASE_URL`. Use a conexão PostgreSQL completa do Session pooler com senha codificada para URL. As chaves da API HTTP não substituem essa conexão. Segredos ficam apenas no `.env`, ignorado pelo Git.

`npm run supabase:setup` aplica migrations, transfere o catálogo local e completa a meta. `npm run supabase:transfer` transfere somente categorias, artistas e músicas pela Data API; não copia jogadores ou partidas. Para banco vazio, o SQL Editor pode executar `supabase/bootstrap.sql`; registre as quatro migrations como aplicadas antes de executar Prisma migrate deploy. Em bancos existentes, aplique somente as migrations pendentes.

RLS e revogação de acesso a `anon` e `authenticated` protegem todas as tabelas internas. O backend acessa PostgreSQL com a função de servidor; não exponha a conexão ou crie leitura pública de rodadas/respostas. Em produção use HTTPS, `NODE_ENV=production` e segredos próprios.

## Verificação

`npm run lint`, `npm run typecheck`, `npm run build` e `npm test` validam o backend. Os testes iniciam PostgreSQL temporário isolado e usam FFmpeg real; não alteram o banco de desenvolvimento. No Linux, PostgreSQL exige usuário comum.

`npm run test:stack` valida uma partida completa pelo proxy local em 127.0.0.1:5173, busca no catálogo e as cinco durações de áudio. `npm run test:live` importa dados externos em banco temporário. Ambos dependem da disponibilidade externa.

Verificação de 15/09/2026: 59 testes automatizados aprovados; partida real de 10 músicas concluída; 88 fontes de áudio verificadas com sucesso. Catálogo persistido: 5.536 músicas, 55 artistas com músicas importadas, 201 artistas cadastrados e nove grupos. Essa amostra não representa auditoria individual das 5.536 fontes. Containers ainda precisam de validação em ambiente com Docker.

Os previews são fornecidos por terceiros. A implementação técnica não concede direitos de uso ou licença de distribuição; mantenha a avaliação de licenciamento do provedor antes da publicação comercial.
