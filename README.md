

## Enquadramento da foto

Aplique o conteúdo de `supabase/migrations/006_photo_framing.sql` uma vez no SQL Editor. Adiciona posição horizontal (0–100) e zoom (1–3), preservando o enquadramento antigo por padrão. Minha carta permite prévia, redefinição e salvamento dos três ajustes. As permissões continuam limitadas ao próprio perfil.

## Mensalistas e convidados

Execute uma vez o conteúdo de `supabase/migrations/007_monthly_waitlist.sql` no SQL Editor, após as anteriores. Cadastros atuais e novos começam como convidados. Em Administração → Jogadores, selecione até 24 mensalistas. Ao criar uma nova pelada, todos os mensalistas são confirmados automaticamente. A migração 012 abaixo estende essa regra às peladas já abertas.

Convidados entram na fila por ordem de inscrição; com vaga disponível, são confirmados imediatamente. Cancelamentos até uma hora antes promovem automaticamente o primeiro da fila. Reinscrição vai para o final, inclusive de mensalistas. A lista de espera não permite registrar desempenho. A aplicação atualiza os dados a cada 30 segundos e ao voltar à aba.

## Cancelamento de peladas

Execute o conteúdo de `supabase/migrations/008_cancel_session.sql` no SQL Editor após as migrações anteriores. Administração → Peladas → Controle das peladas → Cancelar pelada pede confirmação e permite cancelar somente antes do horário de início. A regra é validada no banco. Inscrições são preservadas como histórico, alterações ficam bloqueadas inclusive para administradores, e a pelada não conta no ranking. Para jogar novamente, crie outra pelada.

## Craque da pelada

Execute o conteúdo de `supabase/migrations/009_match_star.sql` no SQL Editor após as anteriores. Na Administração, escolha o craque entre os confirmados após o início da pelada. Pode corrigir ou remover a escolha, inclusive após encerrar. Peladas canceladas não exibem craque. O prêmio não altera o ranking.

A carta aparece na pelada na página inicial e em Peladas. Baixar carta gera um PNG de 1080 × 1350 com foto, nome, data e gols/assistências atuais daquela pelada, no próprio navegador. Compartilhar abre o menu nativo quando suportado; nos demais navegadores, baixa a imagem. A prévia oferece um link para salvar e opção sem foto em caso de falha no carregamento.

A carta do craque também inclui posição e pontos no ranking geral do mês da pelada, respeitando os desempates existentes. O mês e o horário de geração (João Pessoa) aparecem no PNG. A classificação usa os dados carregados mais recentes, não uma posição congelada na data do jogo. Alterações de números ou posição invalidam a prévia anterior. Não exige nova migração.

A exportação do craque agora renderiza o mesmo componente PlayerCard usado no perfil e no ranking, com foto original, posição e zoom salvos. O PNG é capturado em resolução 3×; a carta mostra os números mensais, enquanto o rodapé identifica os gols e assistências da pelada. A moldura, gradientes e tipografia são compartilhados, evitando diferenças de enquadramento causadas pelo antigo desenho em canvas.

O craque agora aparece como botão compacto na pelada. A carta e as opções de exportar ficam em uma janela com fechamento por botão ou Escape. A versão especial usa borda dourada, selo de destaque e fundo preto/dourado no PNG, preservando a foto e os ajustes do perfil. Sem nova migração.

A exportação do craque usa formato Story 9:16 em 2160 × 3840, fundo preto sem borda externa e sem marca no topo ou data de geração. O painel de ranking destaca posição, total de jogadores do clube, pontos e progresso até 100. A moldura da carta é preservada. Sem nova migração.

### Time do coração
Execute o conteúdo de `supabase/migrations/010_favorite_club.sql` no SQL Editor após as migrações anteriores. A seleção é opcional em Minha carta e aparece também na imagem do craque. Catálogo: `lib/football-clubs.json`. Escudos e fontes: `public/club-crests/SOURCES.md`. Novos clubes exigem atualizar a restrição do banco em nova migração.

## Confirmação manual e convidados (regra atual)

Execute `supabase/migrations/014_manual_attendance.sql` após as migrações anteriores. Esta regra substitui as confirmações e promoções automáticas descritas nas migrações 007 e 012: toda nova pelada começa sem inscritos, e mudar o tipo do jogador não cria presença. Mensalistas confirmam por conta própria quando há vaga; com 24 confirmados, entram na espera. Convidados entram sempre na espera, mesmo havendo vagas. A fila é numerada pela ordem de inscrição; sair e voltar coloca o jogador no final. Cancelamentos nunca promovem alguém automaticamente.

Na lista de espera da pelada, administradores podem adicionar convidados cadastrados e escolher **Mover para confirmados** ao lado do jogador desejado. Somente o administrador libera jogadores, com limite de 24 vagas, enquanto a pelada estiver aberta e antes do início. A posição é informativa; o administrador escolhe quem liberar. Os prazos de confirmação e cancelamento continuam iguais. A migração preserva todas as inscrições existentes; não zera listas de peladas já criadas.

## Mensalistas em peladas abertas e lista para copiar (regra anterior à 014)

Execute `supabase/migrations/012_monthly_open_sessions.sql` no SQL Editor após a 011. Ao mudar de convidado para mensalista, o jogador entra em todas as peladas abertas que ainda não começaram. São respeitadas as 24 vagas e a ordem da fila: ninguém é removido para dar lugar ao novo mensalista. Inscrições existentes não são duplicadas nem perdem sua posição. Repetir o salvamento de um mensalista não desfaz cancelamentos; voltar a convidado mantém as presenças. A migração não inscreve retroativamente quem já era mensalista, para não desfazer cancelamentos anteriores.

Cada pelada oferece **Copiar lista de confirmados**, com todos os confirmados, suas classificações atuais, horário e totais. A fila de espera não é incluída. Se o navegador bloquear a área de transferência, a lista aparece em um campo para copiar manualmente. Peladas canceladas são identificadas no texto como histórico.

## Excluir pelada encerrada

Execute `supabase/migrations/013_delete_closed_session.sql` no SQL Editor após as anteriores. Administração → Controle das peladas exibe **Excluir pelada** somente para peladas encerradas, com confirmação explícita. A exclusão é permanente: remove a partida, presenças, desempenhos e histórico de alterações desses desempenhos. As cartas e o ranking passam a considerar somente os jogos restantes. Perfis, pagamentos e outras peladas são preservados. O banco limita a ação a administradores e revalida o encerramento sob bloqueio, inclusive se outro administrador reabrir a partida antes da confirmação. Não é necessário excluir nem recriar jogadores.

## Retirar jogadores dos confirmados

Execute o conteúdo de `supabase/migrations/015_admin_remove_attendance.sql` no SQL Editor após as anteriores. Na lista **Ver confirmados**, administradores encontram **Retirar** em cada jogador, com confirmação antes da remoção. A ação funciona enquanto a pelada estiver aberta, inclusive dentro da última hora e após o início. Não promove ninguém da espera automaticamente. Jogadores com desempenho registrado ou escolhidos como craque têm a presença protegida. Peladas encerradas e canceladas preservam suas listas. A permissão é validada no banco.

## Pagamentos

Execute uma vez o conteúdo de `supabase/migrations/011_payments.sql` no SQL Editor após as migrações anteriores. A aba Pagamentos lista os mensalistas e permite que cada um envie o próprio comprovante; administradores também podem registrar e revisar pagamentos em nome deles.

Os comprovantes ficam em um bucket privado, são normalizados para WebP no navegador e limitados a 3 MB e 20 megapixels. Quando o navegador suporta leitura de QR, a interface procura um payload Pix oficial, mas o resultado é apenas preliminar: todo envio permanece como “Aguardando confirmação” até a revisão da organização. Valores, imagens e situação detalhada são visíveis somente para o próprio jogador e administradores.

## Primeiro período de ranking

Setembro e outubro de 2026 formam um único período de pontuação. Selecionar qualquer um desses meses mostra o mesmo ranking acumulado, inclusive nas cartas e no craque da pelada. Em 01/11/2026 volta a valer o ranking mensal, começando com 50 pontos e somando apenas os jogos de novembro. Resultados e datas originais permanecem salvos; nenhuma migração ou recadastro é necessário. Os pagamentos continuam separados por mês.

## Desempate e posições do ranking

As posições são sequenciais (1, 2, 3...), sem repetição. Em empate no critério selecionado (pontos, gols ou assistências), vale somente a ordem alfabética do nome, desconsiderando maiúsculas e acentos. Nomes iguais têm ordem estável pelo identificador do jogador. A mesma regra é usada nas cartas, no pódio e na imagem do craque.
