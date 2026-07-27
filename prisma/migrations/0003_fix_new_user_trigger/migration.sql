-- public.users."updatedAt" has no DB-level default (Prisma's @updatedAt is
-- applied client-side only), so the auth trigger's raw INSERT needs to set
-- it explicitly or every signup fails with a NOT NULL violation.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, "organizationId", email, name, role, "updatedAt")
  values (
    new.id::text,
    new.raw_user_meta_data ->> 'organization_id',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::"Role", 'CUSTOMER'),
    now()
  );
  return new;
end;
$$;
