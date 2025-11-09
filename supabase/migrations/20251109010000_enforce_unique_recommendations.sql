-- Ensure only one recommendation per user and date.
-- Remove all but the latest record (highest id) for duplicates, then add a unique constraint.

with ranked as (
  select id, user_id, date,
         row_number() over (partition by user_id, date order by id desc) as rn
  from public.recommendations
)
delete from public.recommendations r
using ranked dup
where r.id = dup.id
  and dup.rn > 1;

alter table public.recommendations
  add constraint recommendations_user_date_unique unique (user_id, date);

