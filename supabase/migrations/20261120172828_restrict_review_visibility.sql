revoke select on table public.reviews from anon;

drop policy if exists reviews_public_read on public.reviews;

create policy reviews_owner_or_admin_read
on public.reviews
for select
to authenticated
using (
  customer_id = (select auth.uid())
  or (select private.is_admin())
);
