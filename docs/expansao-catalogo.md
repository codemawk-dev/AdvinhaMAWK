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
