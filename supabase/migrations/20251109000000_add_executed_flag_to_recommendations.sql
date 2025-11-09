-- Add executed flag to recommendations to track whether a refeed was carried out.
alter table public.recommendations
  add column if not exists executed boolean not null default false;

comment on column public.recommendations.executed is 'Indicates whether the suggested refeed was actually executed by the user.';


