

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

## Redução do tráfego de imagens

Links assinados de fotos são reutilizados em memória durante a sessão, com renovação um minuto antes de expirar. Atualizações a cada 30 segundos não trocam mais esses links. Mudanças de usuário ou modo demonstração criam um cache separado. Pedidos simultâneos compartilham a assinatura; falhas permitem nova tentativa. Comprovantes só são assinados e exibidos ao clicar em Comprovante. Nenhum bucket torna-se público e nenhuma migração é necessária. O consumo já contabilizado pelo Supabase não é reduzido retroativamente.

## Troca de projeto Supabase — 06/10/2026

A implantação passou a usar o projeto nczbfnuwqrqmeprjuqtt. URL e chave pública são configuradas no .env.local ignorado pelo Git e incorporadas no build estático; o .env não deve ser publicado no repositório. Os dados e contas foram copiados e verificados. Referências de fotos ausentes foram limpas no destino para permitir reenvio, preservando os resultados. Um comprovante não foi recuperado e precisa de reenvio; seu registro foi mantido. É necessário entrar novamente. Configurações de confirmação de e-mail e URLs de redirecionamento devem ser conferidas no painel do novo projeto.
# Avaliações desativadas

A migração `025_disable_player_reviews.sql` retira a exigência de notas e o bloqueio de presença, desativa as APIs de avaliação e libera pendências em abas antigas. A interface não oferece votação, médias ou correções. Encerrar registros passa a fechar a pelada diretamente, com qualquer quantidade de participantes. Os dados históricos de notas permanecem arquivados no banco, sem acesso pelo app.

## Cadastro por convite

A migração `019_inviter_approval.sql` preserva os membros existentes como aprovados. Novos cadastros devem selecionar um membro aprovado no campo “Quem convidou você?” e começam pendentes. A busca pública mostra somente identificador, nome e posição dos jogadores aprovados (mínimo de duas letras, até 30 resultados), sem e-mails ou fotos.

A aba **Convites** permite confirmar ou recusar os próprios convidados. O administrador vê todos os convites, o responsável pelo convite, a situação, quem analisou e quando; também pode aprovar, recusar ou reconsiderar uma recusa. O responsável é fixado pelo banco no cadastro e não muda com a edição de metadados da conta. Membros anteriores não recebem um responsável fictício.

Pendentes e recusados podem entrar na conta apenas para consultar o próprio status e sair. As políticas do banco bloqueiam dados da pelada, fotos e novas presenças até a aprovação. A tela verifica a situação periodicamente e oferece “Verificar confirmação”.

Aplique a migração antes de publicar este frontend. Na implantação inicial de um banco vazio, crie o primeiro administrador antes da migração 019. Testes: `npm test` e `npm run test:e2e -- invitations.spec.ts` (cadastro, espera, aprovação e layout móvel com API simulada).

A migração `020_required_registration_photo.sql` exige foto apenas nos cadastros criados após sua aplicação. Depois de criar a conta, o jogador envia uma foto JPG/PNG/WebP (até 5 MB), normalizada em WebP de até 1200 px. Falhas permitem tentar novamente, inclusive depois de novo login. A aprovação é bloqueada no banco até existir a foto; a aba Convites indica quando o envio está pendente. Contas antigas mantêm o acesso. Durante o cadastro, o Storage permite somente o arquivo privado do próprio jogador (`registration.webp`); as fotos e os dados dos outros continuam indisponíveis. O enquadramento pode ser ajustado em Minha carta após aprovação.

A migração `021_photo_required_for_all.sql` estende a exigência de foto às contas existentes, incluindo administradores. Quem está sem foto vê um modal obrigatório antes das outras telas, sem fechar, sair, Esc ou clique externo. A exigência persiste ao recarregar ou entrar novamente, e termina após o envio e salvamento. Quem já tem foto não precisa reenviar. Aprovação, presenças, desempenhos e histórico são preservados. O banco limita o acesso dos membros sem foto e mantém uma exceção restrita para enviar e vincular a própria imagem.

A migração `022_registration_photo_framing.sql` salva o enquadramento junto com a foto no cadastro e no modal obrigatório: horizontal/vertical de 0 a 100 e zoom de 1× a 3×. A prévia utiliza a mesma regra visual da carta; Redefinir retorna a 50% horizontal, 25% vertical e 1×. Foto e ajustes são vinculados em uma única transação, com validação de limites no banco. A versão sem parâmetros da função permanece disponível para abas antigas. Enquadramentos já salvos não são alterados.

A migração `023_unlimited_monthly_members.sql` remove o limite de mensalistas cadastrados. Somente administradores podem alterar o tipo de jogador; essa alteração não mexe nas presenças existentes. Cada pelada mantém o máximo de 24 confirmados. Mensalistas que confirmarem após lotar entram na espera; convidados continuam com liberação manual. A demonstração segue a mesma regra.

## Artes de premiação

A aba **Premiação** gera pódios de ranking geral, gols e assistências, além da carta de jogador do mês. Usa o período selecionado, as fotos e o enquadramento das cartas atuais, sem mudar os registros. O ranking inaugural continua somando setembro e outubro de 2026; novembro em diante é mensal.

Story: PNG 1080 × 1920. Feed: PNG 1080 × 1350. A prévia usa o mesmo conteúdo da exportação. Compartilhar usa o compartilhamento de arquivos do dispositivo quando disponível e oferece download nos demais casos. Fotos e escudos são incorporados à imagem somente ao exportar, sem alterar os links usados pelo app.

Só entram na premiação jogadores com desempenho registrado no período; gols e assistências exigem pelo menos um registro positivo na categoria. Se houver menos de três elegíveis, aparecem apenas os disponíveis. Empates seguem a ordem alfabética do ranking. O jogador do mês começa no líder geral elegível; o ADM pode trocar o escolhido **para a arte atual**, sem registrar uma premiação oficial no banco ou alterar o ranking. O resultado reflete os dados atuais, não um fechamento imutável do mês.

Validação da exportação: `npm run test:e2e -- monthly-awards.spec.ts` gera as oito combinações, verifica dimensões PNG, enquadramento sem sobreposição, seleção do jogador, pódios, período histórico e estado vazio de novembro.
