

## Enquadramento da foto

Aplique o conteúdo de `supabase/migrations/006_photo_framing.sql` uma vez no SQL Editor. Adiciona posição horizontal (0–100) e zoom (1–3), preservando o enquadramento antigo por padrão. Minha carta permite prévia, redefinição e salvamento dos três ajustes. As permissões continuam limitadas ao próprio perfil.

## Mensalistas e convidados

Execute uma vez o conteúdo de `supabase/migrations/007_monthly_waitlist.sql` no SQL Editor, após as anteriores. Cadastros atuais e novos começam como convidados. Em Administração → Jogadores, selecione até 24 mensalistas. Ao criar uma nova pelada, todos os mensalistas são confirmados automaticamente. Alterar a classificação não muda inscrições existentes.

Convidados entram na fila por ordem de inscrição; com vaga disponível, são confirmados imediatamente. Cancelamentos até uma hora antes promovem automaticamente o primeiro da fila. Reinscrição vai para o final, inclusive de mensalistas. A lista de espera não permite registrar desempenho. A aplicação atualiza os dados a cada 30 segundos e ao voltar à aba.
