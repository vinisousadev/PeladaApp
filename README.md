

## Enquadramento da foto

Aplique o conteúdo de `supabase/migrations/006_photo_framing.sql` uma vez no SQL Editor. Adiciona posição horizontal (0–100) e zoom (1–3), preservando o enquadramento antigo por padrão. Minha carta permite prévia, redefinição e salvamento dos três ajustes. As permissões continuam limitadas ao próprio perfil.

## Mensalistas e convidados

Execute uma vez o conteúdo de `supabase/migrations/007_monthly_waitlist.sql` no SQL Editor, após as anteriores. Cadastros atuais e novos começam como convidados. Em Administração → Jogadores, selecione até 24 mensalistas. Ao criar uma nova pelada, todos os mensalistas são confirmados automaticamente. Alterar a classificação não muda inscrições existentes.

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
