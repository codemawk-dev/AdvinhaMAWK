# Expansão do catálogo

O seed reúne mais de 800 nomes brasileiros em dez grupos editoriais. Cadastrar um nome não o torna jogável: a importação exige identidade Apple inequívoca, URL de prévia permitida, título válido e gravação aceita. Duplicatas normalizadas preservam o grupo principal anterior. Artistas com nomes ambíguos ficam pendentes para curadoria.

Execute a partir de backend:

```sh
npm run catalog:sync -- --all
npm run catalog:sync -- --expand
```

O primeiro comando processa artistas com sincronização vencida e novos cadastros. O segundo amplia todos os artistas ativos que já têm appleArtistId confirmado: consulta até dez IDs por lote, procurando tanto repertório padrão quanto lançamentos recentes (até 200 resultados por artista/consulta). Filtra colaboradores não solicitados pelo ID, passa pela mesma deduplicação e não desativa músicas ausentes de resultados parciais. Os modos são separados para não dobrar o tráfego do agendador normal.

A expansão usa o mesmo bloqueio de banco da sincronização, respeita espaçamento e retentativas do cliente e pode ser reexecutada. O contador imported representa gravações aceitas/atualizadas, não necessariamente novas linhas. Compare as contagens reais de músicas e artistas com faixas antes/depois.

Fonte técnica: [exemplos oficiais de consultas por IDs da Apple](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/LookupExamples.html). A API entrega resultados limitados; a busca não garante toda a discografia nem todas as músicas brasileiras. Prévia cadastrada não equivale a audição manual: o jogo continua preparando e validando o áudio antes da rodada.

Para copiar registros novos ao projeto Supabase configurado:

```sh
npm run supabase:transfer
```

A transferência atual preserva IDs existentes e não substitui registros remotos anteriores. Nunca colocar credenciais em arquivos versionados. O aplicativo local só usa o banco apontado por DATABASE_URL.

Para retomar uma expansão interrompida, o log de cada lote concluído informa lastArtistId:

```sh
npm run catalog:sync -- --expand --after-artist UUID_DO_ULTIMO_LOTE
```

Use o cursor apenas se os lotes anteriores não tiveram falhas; caso contrário, repetir sem cursor é seguro. Novos artistas inseridos com IDs anteriores ao cursor serão incluídos na próxima passagem completa. A gravação usa transações de até 100 faixas e elimina trackIds já processados entre as buscas padrão/recentes do mesmo lote. Isso mantém deduplicação e pesos editoriais sem executar um commit por faixa.

O sorteio também aplica gêneros e anos na consulta ao banco antes de carregar candidatos, mantendo a mesma regra de ano original/edição usada na contagem e na seleção do jogo.

As consultas de discografia usam até quatro conexões em andamento, mas o início de cada requisição continua espaçado pelo intervalo configurado (quatro segundos por padrão). Retentativas e Retry-After adiam também as próximas consultas da fila. A expansão processa grupos de 40 artistas em subconsultas de até dez IDs, com ponto de retomada apenas depois de concluir o grupo.

Para repetir apenas um grupo que falhou, use os limites afterArtistId (exclusivo) e untilArtistId (inclusivo) informados pelo erro:

```sh
npm run catalog:sync -- --expand --after-artist UUID_ANTERIOR --until-artist UUID_FINAL
```

Omitir after-artist inclui o primeiro grupo. Consultas parciais e falhas de rede não removem músicas; a repetição usa os mesmos IDs e regras de deduplicação.
