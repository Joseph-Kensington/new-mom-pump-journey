-- 《她的一天｜新手妈妈旅程》排行榜升级脚本
-- 在 Supabase Dashboard → SQL Editor 完整执行一次。
-- 支持同一匿名设备多次完成；不会使用 IP 地址作为身份或排名依据。

create table if not exists public.journey_scores (
  id bigint generated always as identity primary key,
  anonymous_id uuid not null,
  nickname text not null default '匿名旅人' check (char_length(nickname) between 1 and 16),
  energy smallint not null check (energy between 0 and 100),
  calm smallint not null check (calm between 0 and 100),
  ready smallint not null check (ready between 0 and 100),
  team smallint not null check (team between 0 and 100),
  total_score integer generated always as (energy + calm + ready + team) stored,
  game_version text not null default 'v9' check (char_length(game_version) between 1 and 32),
  completed_at timestamptz not null default now()
);

alter table public.journey_scores drop constraint if exists journey_scores_anonymous_id_game_version_key;
alter table public.journey_scores enable row level security;
revoke all on public.journey_scores from anon, authenticated;

drop function if exists public.submit_journey_score(uuid, text, smallint, smallint, smallint, smallint, text);
drop function if exists public.get_journey_leaderboard(uuid, text);
drop function if exists public.get_journey_leaderboard(uuid, text, bigint);

create function public.submit_journey_score(p_anonymous_id uuid, p_nickname text, p_energy smallint, p_calm smallint, p_ready smallint, p_team smallint, p_game_version text)
returns table(submission_id bigint, rank bigint, nickname text, total_score integer, energy smallint, calm smallint, ready smallint, team smallint)
language plpgsql security definer set search_path = public as $$
declare saved_id bigint; safe_nickname text;
begin
  if p_energy not between 0 and 100 or p_calm not between 0 and 100 or p_ready not between 0 and 100 or p_team not between 0 and 100 then raise exception 'Invalid score'; end if;
  safe_nickname := left(regexp_replace(trim(coalesce(p_nickname, '')), '[^[:alnum:] _-]', '', 'g'), 16);
  if safe_nickname = '' then safe_nickname := '匿名旅人'; end if;
  insert into public.journey_scores (anonymous_id, nickname, energy, calm, ready, team, game_version)
  values (p_anonymous_id, safe_nickname, p_energy, p_calm, p_ready, p_team, left(p_game_version, 32))
  returning id into saved_id;
  return query with ranked as (
    select s.*, row_number() over (order by s.total_score desc, s.completed_at asc, s.id asc) as position
    from public.journey_scores s where s.game_version = left(p_game_version, 32)
  ) select r.id, r.position, r.nickname, r.total_score, r.energy, r.calm, r.ready, r.team from ranked r where r.id = saved_id;
end; $$;

create function public.get_journey_leaderboard(p_anonymous_id uuid, p_game_version text, p_current_id bigint default null)
returns table(rank bigint, nickname text, total_score integer, energy smallint, calm smallint, ready smallint, team smallint, is_current boolean)
language sql security definer set search_path = public as $$
  with ranked as (
    select s.*, row_number() over (order by s.total_score desc, s.completed_at asc, s.id asc) as position
    from public.journey_scores s where s.game_version = left(p_game_version, 32)
  )
  select position, nickname, total_score, energy, calm, ready, team,
    case when p_current_id is not null then id = p_current_id else false end
  from ranked where position <= 100 or id = p_current_id order by position;
$$;

revoke all on function public.submit_journey_score(uuid, text, smallint, smallint, smallint, smallint, text) from public;
revoke all on function public.get_journey_leaderboard(uuid, text, bigint) from public;
grant execute on function public.submit_journey_score(uuid, text, smallint, smallint, smallint, smallint, text) to anon, authenticated;
grant execute on function public.get_journey_leaderboard(uuid, text, bigint) to anon, authenticated;