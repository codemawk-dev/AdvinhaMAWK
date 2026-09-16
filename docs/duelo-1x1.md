# Duelo 1x1 — proposta de implementação

Status: desenho técnico; o multiplayer ainda não está implementado. A tela antiga DuelScreen é um protótipo sem backend e não deve ser ativada como se fosse um duelo funcional.

## Experiência proposta

1. Criar sala privada, escolher estilos e anos e compartilhar um link com código aleatório.
2. Um segundo visitante entra; ambos veem os filtros e confirmam que estão prontos. Máximo de dois participantes. Filtros ficam congelados ao entrar o segundo jogador.
3. Dez músicas iguais, na mesma ordem, com o mesmo trecho inicial e as mesmas cinco pistas (0,1 / 0,5 / 2 / 8 / 15 segundos). Cada jogador avança suas pistas independentemente.
4. Pontos pelas pistas usadas, usando a regra progressiva atual. Sem bônus de velocidade, para reduzir a influência da conexão. Quem terminar espera; a resposta só aparece quando ambos terminarem.
5. Resultado por soma dos pontos. Empate é empate. Revanche requer confirmação dos dois e sorteia outra sequência. Ranking do duelo separado do ranking solo.

## Estado e persistência

Criar modelos próprios: DuelRoom (código, filtros, status, rodada atual, revisão, expiração), DuelParticipant (usuário, posição 1/2, pronto, presença), DuelRound (música e metadados privados, âncora de áudio, revisão, prazo) e DuelAttempt (participante, rodada, pista, palpite, resultado). Restrições únicas por sala/usuário, sala/posição, sala/rodada e rodada/participante/revisão/pista. Todas as tabelas com RLS e acesso só pelo backend.

Estados: WAITING → READY → ACTIVE → ROUND_RESULT → ACTIVE/FINISHED. CANCELLED e EXPIRED como saídas explícitas. Sala vazia aguardando expira em dez minutos; partida expira em 24 horas. Entrada do segundo participante, respostas e avanço de rodada precisam de transação com bloqueio da sala, como o bloqueio de Game atual.

Não criar dois jogos solo: eles sorteiam músicas diferentes e revelam a resposta logo após o primeiro acerto. Reutilizar seleção, validação de preferências, processamento de áudio e cálculo de pontos, separando a coordenação do duelo.

## Contrato da API

- POST /duels: cria sala e código imprevisível; limite por visitante/IP.
- POST /duels/join: entrada atômica pelo código; rejeita sala cheia, expirada e usuário repetido.
- POST /duels/:id/ready: confirma preparo de áudio/interação necessária para reprodução no navegador.
- GET /duels/:id: snapshot autorizado, estado e revisão, sem resposta ou palpites privados do adversário.
- POST /duels/:id/guess e /skip: roundId, attempt, revision e chave de idempotência; resultado privado sem revelar título antes do encerramento comum.
- POST /duels/:id/leave: abandono explícito.

MVP: consultar snapshot a cada dois segundos somente enquanto a página estiver visível e sincronizar ao voltar à aba. Esse ritmo cabe no limite atual de 120 requisições/minuto com folga para palpites; aplicar também limites por usuário. Evolução para SSE é opcional. PostgreSQL é a fonte de verdade; mensagens/presença em memória nunca podem decidir pontuação. Não é necessário adicionar Redis para o MVP por polling.

## Justiça, tempo e falhas

Preparar o áudio antes de liberar a rodada para ambos; persistir a mesma âncora/versão de processamento para garantir o mesmo trecho, inclusive depois de reinício. Não confiar no início informado pelo cliente. Proposta de limite do duelo: 90 segundos por rodada após ambos estarem prontos, prazo absoluto controlado pelo servidor e exibido como contagem regressiva. O solo continua sem cronômetro. Prazo precisa ser aplicado transacionalmente em qualquer comando/consulta, além de eventual worker, para não depender de um timer de processo.

Reconexão restaura snapshot e tentativas; tolerância proposta de 30 segundos de ausência. Não pausar indefinidamente por ausência, pois isso permite travar a sala. Abandono após a tolerância registra desistência; queda geral do serviço cancela sem pontuar competição. Antes de pronta, falha permanente de áudio substitui a música para ambos. Se uma falha comprovada ocorrer após início, anular a rodada para ambos e substituí-la, revertendo pontos provisórios. Erro de reprodução relatado pelo cliente sozinho não autoriza anulação: o servidor precisa validar a fonte para evitar abuso.

Resposta correta e URL original nunca entram no estado público. Quem acerta cedo não recebe o título oficial até o adversário terminar. A sessão atual identifica um visitante; mudar de navegador gera outra identidade. Duelo casual por convite é viável com isso; competição com prêmios ou ranking confiável exige autenticação e política contra múltiplas contas.

## Ordem de entrega e aceite

1. Migração/modelos, regras de estado e testes de concorrência; endpoints autorizados e idempotentes.
2. Sala por convite, pronto/aguardando, rodada e placar; estados de reconexão e desistência.
3. Testes com dois navegadores: disputa pela última vaga, terceiro usuário, palpite repetido, revisão antiga, recarga, áudio igual, prazo, empate, vazamento de resposta e falha do provedor.
4. Publicar frontend e API HTTPS para os dois jogadores alcançarem a mesma instância/banco. O endereço localhost atual só atende este computador. A cópia do catálogo no Supabase não muda automaticamente a conexão DATABASE_URL da aplicação.

Considerar o MVP pronto somente quando os dois jogadores concluírem a mesma partida em dispositivos diferentes, com reconexão testada. Não colocar botão de duelo ativo enquanto esse fluxo não existir.
