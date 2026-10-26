begin;

-- Retire the feature without deleting historical votes or their audit trail.
drop trigger if exists guard_attendance_reviews on public.attendances;
create or replace function public.has_pending_reviews(p_player uuid) returns boolean
language sql stable security definer set search_path='' as $$ select false $$;

-- Older open tabs must release their mandatory modal on the next poll.
create or replace function public.pending_player_reviews() returns jsonb
language sql stable security definer set search_path='' as $$ select '[]'::jsonb $$;
update public.review_rounds set closed_at=clock_timestamp() where closed_at is null;

revoke all on public.review_rounds,public.review_participants,public.player_reviews,public.review_corrections from public,anon,authenticated;
revoke all on function public.start_player_reviews(uuid,uuid[]),
 public.submit_player_review(uuid,uuid,integer,integer),
 public.manage_player_reviews(uuid,text,uuid),
 public.player_review_results(uuid),
 public.admin_player_review_results(uuid),
 public.admin_review_votes(uuid,uuid),
 public.admin_correct_review(uuid,uuid,uuid,integer,integer,timestamptz,text)
 from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
