# Pelada Club

Aplicativo em Next.js, TypeScript, Tailwind CSS e Supabase para um clube com jogadores fixos e convidados, sem limite fixo de cadastros e com até 24 participantes por pelada. Inclui login com senha, recuperação de acesso, cadastro aberto com confirmação de e-mail, fotos em cartinhas, gols e assistências por pelada, ranking mensal, administração e histórico de alterações.

## Rodar localmente

Requisitos: Node.js 22 ou superior e npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

No PowerShell, copie com `Copy-Item .env.example .env.local`. Sem configuração do Supabase, a tela de entrada oferece uma demonstração explícita. Ela usa apenas dados fictícios na memória e não representa contas ou dados persistentes.

## Ativar o Supabase

1. Crie um projeto no Supabase. Guarde a senha do banco fora do código.
2. Em um projeto vazio, execute as migrações 001, 002 e 003, nessa ordem. Para atualizar este projeto existente (001 e 002 já aplicadas), execute somente o conteúdo de `supabase/migrations/003_open_signup.sql`. A 003 abre o cadastro sem alterar contas, fotos, desempenhos ou administradores existentes.
3. Em um projeto novo, cadastre sua conta e confirme o e-mail. Depois, no SQL Editor, atribua o papel de administrador somente à sua conta:

```sql
update public.profiles set role='admin'
where id=(select id from auth.users where lower(email)='SEU_EMAIL_EM_MINUSCULAS');
```

4. Em Authentication → URL Configuration, configure a URL final do aplicativo como Site URL e permita os redirecionamentos para `http://localhost:3000/`, `http://localhost:3000/?recover=1`, a URL publicada com `/` e a URL publicada com `/?recover=1`.
5. Mantenha o provedor Email e o cadastro ativados, confirmação de e-mail habilitada, senha mínima de 8 caracteres. Configure SMTP próprio para enviar confirmação e recuperação de senha para a turma; o serviço de e-mail de teste do Supabase tem restrições de destinatários e limites e não deve ser tratado como entrega garantida em produção.
6. Copie Project URL e a chave pública publishable/anon para `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

**Nunca coloque senha do banco, secret key ou service_role em uma variável NEXT_PUBLIC.** O aplicativo só precisa da chave pública; o banco aplica as permissões.

7. Reinicie o desenvolvimento ou refaça o build para aplicar as variáveis. São valores de build em uma exportação estática, não variáveis que mudam automaticamente após publicar.
8. Use Criar conta e preencha nome, e-mail e senha. Cada jogador confirma seu e-mail e entra diretamente, sem aprovação. Novos cadastros sempre recebem o papel de jogador; metadados enviados pelo cliente não concedem administração.
9. Crie a primeira pelada. Faça o teste com duas contas: uma registra seus totais, a outra vê o ranking atualizado e não consegue editar o desempenho alheio. Faça uma correção como administrador e confira o histórico.

## Comportamento

- O limite de 24 vale por pelada, inclusive para o administrador, e é verificado no banco com bloqueio da linha da pelada. Cadastros e ranking podem conter mais de 24 pessoas. A participação é contabilizada ao salvar o desempenho, inclusive 0 gols e 0 assistências. Quem já tem registro pode continuar corrigindo seus totais quando o jogo está aberto, mesmo lotado.
- A migração 002 remove o limite global de cadastros; a 003 permite cadastro aberto. Aplique somente as migrações que ainda faltam no seu banco.
- Um registro por jogador e por pelada. Gols e assistências são totais independentes; salvar novamente substitui os valores, sem duplicá-los.
- Nota mensal: `min(100, 50 + 3 × gols + 2 × assistências)`. Todos começam em 50 a cada mês, sem acumular nota do mês anterior. Exemplo: 10 gols e 10 assistências levam a 100; em cinco peladas, média de 2 gols e 2 assistências. Em quatro peladas, 3 gols e 2 assistências por jogo também atingem o teto. Os gols e assistências continuam sendo contabilizados depois de 100, e o desempate permanece por gols, depois assistências. Correções recalculam a nota, que pode baixar até 50. O mês usa a data da pelada. O horário de referência é America/Sao_Paulo.
- Desempate por gols e depois assistências. Empates finais compartilham a posição. A ordem alfabética apenas estabiliza a exibição.
- Todos os membros podem consultar o ranking e as cartinhas. Jogadores só gravam o próprio desempenho em peladas abertas que já ocorreram e só editam seu próprio perfil/foto.
- O administrador pode corrigir qualquer desempenho, inclusive após encerrar a pelada. Correções são auditadas em transação pelo banco. A interface mostra as últimas 100 alterações; o histórico completo permanece no banco.
- Proteção contra gravação sobre uma versão desatualizada. Não há política de exclusão de desempenhos: corrija os totais para zero quando necessário.
- Fotos ficam em bucket privado, com URLs temporárias de 1 hora e escrita restrita à pasta do próprio usuário. O navegador normaliza JPG/PNG/WebP para WebP de até 1200px antes do upload. A foto de Obama existe apenas na demonstração e não entra nos perfis reais.
- Atualização compartilhada por consulta a cada 30 segundos, ao voltar à janela e após salvar. O botão Atualizar permite consulta imediata.
- PWA instalável pela opção Adicionar à tela inicial do navegador. Sem conexão, mostra aviso e não finge ter salvo dados. O service worker não armazena dados, sessões nem fotos privadas.

## Verificação

```sh
npm test
npm run typecheck
npm run build
```

Os testes executam a migração em PostgreSQL local via PGlite, com estruturas de auth/storage de teste, e verificam permissões, auditoria, limites e ranking. Eles não substituem uma verificação final no Supabase real, que depende do projeto e da configuração de e-mail.

## Publicação

`next build` produz `out/`, uma exportação estática que acessa Supabase por HTTPS. Pode ser hospedada em Sites ou outro host estático. Não há segredo de servidor no pacote público. Ao usar Sites, a publicação inicial é privada para o proprietário; liberar o endereço para os jogadores requer mudar explicitamente a audiência do site. O login individual do Pelada Club continua sendo exigido para dados reais.

## Estado de entrega

A integração está implementada, mas as contas, fotos e dados reais só funcionam depois que um projeto Supabase for criado, a migração aplicada e as variáveis configuradas. Nenhuma conta real é criada pela demonstração.
