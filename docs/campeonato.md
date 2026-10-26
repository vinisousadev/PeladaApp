# Campeonato por pelada

Na aba **Campeonato**, escolha uma pelada. O administrador cadastra quatro times manualmente, com nomes distintos e até seis jogadores confirmados por time. É possível iniciar apenas com os nomes. Os times podem ser editados antes do primeiro resultado registrado.

São seis jogos de pontos, com cada confronto acontecendo uma vez. Vitória vale três pontos; empate, um. A classificação considera somente resultados finalizados e desempata por vitórias, saldo de gols, gols marcados e nome do time (ordenação do banco), nessa ordem.

Depois dos seis resultados finalizados, **Gerar semifinais** cria 1º × 4º e 3º × 2º. Somente o primeiro colocado avança com empate na sua semifinal. Na outra semifinal e na final, o administrador informa quem venceu nos pênaltis quando o placar terminar empatado. Os gols dos pênaltis não são somados ao placar do jogo. Após as semifinais, **Gerar final** cria o confronto dos vencedores. O campeão ganha um destaque na aba.

O administrador usa **Salvar placar** para publicar um resultado parcial e **Finalizar jogo** para atualizar a classificação. Usuários que estão nesta aba recebem atualizações a cada cinco segundos, somente enquanto a página está visível. Fotos não entram nessa consulta.

**Corrigir resultado** reabre um jogo finalizado. Se a próxima fase já foi gerada, use **Desfazer mata-mata para corrigir**, com confirmação explícita. Essa ação apaga semifinais e final, preservando os seis jogos de pontos. Depois de corrigir, gere as fases novamente.

As tabelas `tournaments`, `tournament_teams` e `tournament_games` são criadas pela migração `024_tournaments.sql`. Membros aprovados com foto podem consultar; somente administradores podem alterar por RPC. As alterações usam revisão otimista e bloqueio transacional para impedir sobrescritas silenciosas entre administradores. Peladas canceladas ficam disponíveis somente para leitura. A exclusão da pelada remove o campeonato associado.

Esta versão não altera gols, assistências ou pontuação individual a partir dos jogos do campeonato. A futura pontuação por vitórias ainda precisa de implementação própria.

## Encerramento

Encerrar os registros fecha a pelada diretamente. Não existem avaliações de ataque e defesa ou obrigatoriedade de preencher notas.
