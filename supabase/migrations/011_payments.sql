begin;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  payment_month date not null check (payment_month = date_trunc('month', payment_month)::date),
  amount numeric(10,2) not null check (amount between 0.01 and 9999.99),
  proof_path text not null check (
    char_length(proof_path) between 40 and 220
    and proof_path like player_id::text || '/%'
    and position('..' in proof_path) = 0
  ),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  pix_analysis text not null default 'unverified' check (pix_analysis in ('detected','unverified','unavailable')),
  submitted_by uuid not null references public.profiles(id),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  unique(player_id, payment_month)
);

create index payments_month_status on public.payments(payment_month, status);

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

create policy payments_private_read on public.payments
for select to authenticated
using (player_id = auth.uid() or public.is_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'payment-proofs',
  'payment-proofs',
  false,
  3145728,
  array['image/webp']
);

create policy payment_proof_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and name ~ '^[0-9a-f-]{36}/[0-9]{4}-(0[1-9]|1[0-2])/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
  and (
    (
      (storage.foldername(name))[1] = auth.uid()::text
      and exists(
        select 1 from public.profiles
        where id = auth.uid() and membership = 'monthly'
      )
    )
    or (
      public.is_admin()
      and exists(
        select 1 from public.profiles
        where id::text = (storage.foldername(name))[1]
        and membership = 'monthly'
      )
    )
  )
);

create policy payment_proof_read on storage.objects
for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists(
    select 1 from public.payments
    where proof_path = name
    and (player_id = auth.uid() or public.is_admin())
  )
);

create policy payment_proof_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and public.is_member()
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

create function public.submit_payment(
  p_player_id uuid,
  p_month date,
  p_amount numeric,
  p_proof_path text,
  p_pix_analysis text
) returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.payments;
  saved public.payments;
begin
  if auth.uid() is null or not public.is_member() then
    raise exception 'Usuário não autorizado.';
  end if;
  if p_player_id <> auth.uid() and not public.is_admin() then
    raise exception 'Você só pode registrar o próprio pagamento.';
  end if;
  if not exists(
    select 1 from public.profiles
    where id = p_player_id and membership = 'monthly'
  ) then
    raise exception 'O pagamento é exclusivo para mensalistas.';
  end if;
  if p_month <> date_trunc('month', p_month)::date then
    raise exception 'Mês de pagamento inválido.';
  end if;
  if p_amount < 0.01 or p_amount > 9999.99 then
    raise exception 'Valor de pagamento inválido.';
  end if;
  if p_pix_analysis not in ('detected','unverified','unavailable') then
    raise exception 'Análise do comprovante inválida.';
  end if;
  if char_length(p_proof_path) not between 40 and 220
     or p_proof_path !~ (
       '^' || p_player_id::text || '/' || to_char(p_month, 'YYYY-MM') ||
       '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
     ) then
    raise exception 'Caminho do comprovante inválido.';
  end if;
  if not exists(
    select 1 from storage.objects
    where bucket_id = 'payment-proofs' and name = p_proof_path
  ) then
    raise exception 'Comprovante não encontrado.';
  end if;

  select * into existing
  from public.payments
  where player_id = p_player_id and payment_month = p_month
  for update;

  if existing.status = 'confirmed' then
    raise exception 'Este pagamento já foi confirmado.';
  end if;
  if existing.status = 'pending' then
    raise exception 'Este pagamento já aguarda confirmação.';
  end if;

  insert into public.payments(
    player_id,
    payment_month,
    amount,
    proof_path,
    status,
    pix_analysis,
    submitted_by,
    submitted_at,
    reviewed_by,
    reviewed_at
  ) values (
    p_player_id,
    p_month,
    p_amount,
    p_proof_path,
    'pending',
    p_pix_analysis,
    auth.uid(),
    now(),
    null,
    null
  )
  on conflict(player_id, payment_month) do update set
    amount = excluded.amount,
    proof_path = excluded.proof_path,
    status = 'pending',
    pix_analysis = excluded.pix_analysis,
    submitted_by = auth.uid(),
    submitted_at = now(),
    reviewed_by = null,
    reviewed_at = null
  returning * into saved;

  return saved;
end;
$$;

create function public.review_payment(
  p_payment_id uuid,
  p_status text
) returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare saved public.payments;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode revisar pagamentos.';
  end if;
  if p_status not in ('confirmed','rejected') then
    raise exception 'Situação de pagamento inválida.';
  end if;

  update public.payments set
    status = p_status,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_payment_id and status = 'pending'
  returning * into saved;

  if saved.id is null then
    raise exception 'Pagamento pendente não encontrado.';
  end if;
  return saved;
end;
$$;

revoke all on function public.submit_payment(uuid,date,numeric,text,text) from public;
revoke all on function public.review_payment(uuid,text) from public;
grant execute on function public.submit_payment(uuid,date,numeric,text,text) to authenticated;
grant execute on function public.review_payment(uuid,text) to authenticated;

commit;
