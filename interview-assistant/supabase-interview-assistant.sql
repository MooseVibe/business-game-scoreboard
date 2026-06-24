create table if not exists public.interview_assistant_states (
  session_id text primary key,
  access_key text not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interview_assistant_states enable row level security;

revoke all on public.interview_assistant_states from anon;
revoke all on public.interview_assistant_states from authenticated;

create or replace function public.get_interview_state(
  p_session_id text,
  p_access_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select state
    into result
    from public.interview_assistant_states
   where session_id = p_session_id
     and access_key = p_access_key;

  return result;
end;
$$;

create or replace function public.save_interview_state(
  p_session_id text,
  p_access_key text,
  p_state jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.interview_assistant_states (session_id, access_key, state, updated_at)
  values (p_session_id, p_access_key, p_state, now())
  on conflict (session_id) do update
     set state = excluded.state,
         updated_at = now()
   where public.interview_assistant_states.access_key = p_access_key;
end;
$$;

grant execute on function public.get_interview_state(text, text) to anon;
grant execute on function public.save_interview_state(text, text, jsonb) to anon;
