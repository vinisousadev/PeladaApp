# Pelada Club

Aplicativo em Next.js, TypeScript, Tailwind CSS e Supabase para uma turma de 24 jogadores. Inclui login com senha, recuperação de acesso, cadastro por lista de e-mails, fotos em cartinhas, gols e assistências por pelada, ranking mensal, administração e histórico de alterações.

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
2. Em SQL Editor, execute `supabase/migrations/001_pelada_club.sql` **uma única vez em um projeto vazio**. Não aplique em um projeto que já tenha outros usuários ou tabelas com estes nomes. O gatilho de cadastro restringe novos usuários à turma.
3. Antes de criar a primeira conta, execute o SQL abaixo substituindo o e-mail pelo seu e o nome por seu nome. Essa linha reserva a primeira das 24 vagas como administrador.

```sql
insert into public.roster_slots (email, display_name, role)
values ('SEU_EMAIL_EM_MINUSCULAS', 'Vinicius', 'admin');
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
8. Use Primeiro acesso para cadastrar sua conta com o e-mail do passo 3 e confirme o e-mail. Entre e abra Administração → Acessos para liberar os demais 23 jogadores. Cada pessoa define sua senha. Liberar um e-mail não envia convite automaticamente.
9. Crie a primeira pelada. Faça o teste com duas contas: uma registra seus totais, a outra vê o ranking atualizado e não consegue editar o desempenho alheio. Faça uma correção como administrador e confira o histórico.

## Comportamento

- Um registro por jogador e por pelada. Gols e assistências são totais independentes; salvar novamente substitui os valores, sem duplicá-los.
- Gol vale 3 pontos; assistência, 2. O mês usa a data da pelada. O horário de referência é America/Sao_Paulo.
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
