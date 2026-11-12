begin;
update storage.buckets set allowed_mime_types=array['image/webp','application/pdf'] where id='payment-proofs';
alter policy payment_proof_insert on storage.objects
to authenticated
with check (
  bucket_id = 'payment-proofs'
  and name ~ '^[0-9a-f-]{36}/[0-9]{4}-(0[1-9]|1[0-2])/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|pdf)$'
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

create or replace function public.submit_payment(
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
       '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|pdf)$'
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

notify pgrst,'reload schema';
commit;
