-- RRS v2 preparation: extend recommendations/scores schema and add refeed_sessions.

alter table public.recommendations
  add column if not exists executed_at timestamptz,
  add column if not exists refeed_effect_window integer default 7;

comment on column public.recommendations.executed_at is 'Timestamp when the user confirmed the recommendation was executed.';
comment on column public.recommendations.refeed_effect_window is 'Number of days to apply refeed cooldown and response analysis.';

alter table public.scores
  add column if not exists rrs_v2 numeric(6,3),
  add column if not exists refeed_cooldown numeric(6,3),
  add column if not exists refeed_response numeric(6,3);

comment on column public.scores.rrs_v2 is 'Experimental Refeed Readiness Score that considers refeed history.';
comment on column public.scores.refeed_cooldown is 'Cooldown factor applied after refeed execution.';
comment on column public.scores.refeed_response is 'Aggregated response metric following a refeed.';

create table if not exists public.refeed_sessions (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null,
  executed_at timestamptz not null,
  effect_window integer default 7,
  response numeric(6,3),
  created_at timestamptz default now()
);

create index if not exists idx_refeed_sessions_user_started_at on public.refeed_sessions(user_id, started_at desc);

