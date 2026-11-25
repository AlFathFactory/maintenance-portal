-- Return only the email addresses attached to one inspection's signatures or approval.
-- The caller must be an active HSE member, matching inspection read access.
create function public.hse_inspection_actor_emails(p_inspection_id uuid)
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text
  from auth.users as u
  where u.email is not null
    and exists (
      select 1
      from public.hse_members as m
      where m.user_id = (select auth.uid())
        and m.is_active
    )
    and exists (
      select 1
      from public.hse_chain_inspections as i
      where i.id = p_inspection_id
        and (
          i.approved_by = u.id
          or exists (
            select 1
            from public.hse_inspection_signatures as s
            where s.inspection_id = i.id
              and s.signed_by = u.id
          )
        )
    );
$$;

revoke all on function public.hse_inspection_actor_emails(uuid) from public, anon, authenticated;
grant execute on function public.hse_inspection_actor_emails(uuid) to authenticated;
