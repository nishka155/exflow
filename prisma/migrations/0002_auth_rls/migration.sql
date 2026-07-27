-- Auth linking + Row Level Security
--
-- Architecture note: the Next.js app talks to Postgres through Prisma using
-- the `postgres` role (DATABASE_URL / DIRECT_URL), which owns the schema and
-- bypasses RLS by default — authorization for that path is enforced in
-- server-side code (Server Actions / Route Handlers check the Supabase
-- session + role before every Prisma call). The policies below are a
-- defense-in-depth layer for the `authenticated` Postgres role used by any
-- direct Supabase client access (client-side Storage/table/Realtime calls),
-- so a leaked anon/authenticated JWT can never read across tenants.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.current_org_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select "organizationId" from public.users where id = auth.uid()::text
$$;

create or replace function public.current_user_role()
returns "Role"
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()::text
$$;

create or replace function public.current_customer_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.customers where "portalUserId" = auth.uid()::text
$$;

-- ---------------------------------------------------------------------------
-- auth.users -> public.users sync
--
-- Expects new.raw_user_meta_data to carry { organization_id, name, role }
-- (set via the `data` option when calling supabase.auth.signUp /
-- admin.createUser / admin.inviteUserByEmail during onboarding).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, "organizationId", email, name, role)
  values (
    new.id::text,
    new.raw_user_meta_data ->> 'organization_id',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::"Role", 'CUSTOMER')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
create policy "organizations_self_read" on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

alter table public.users enable row level security;
create policy "users_read_within_org" on public.users
  for select to authenticated
  using ("organizationId" = public.current_org_id());
create policy "users_update_self" on public.users
  for update to authenticated
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

alter table public.customers enable row level security;
create policy "customers_isolation" on public.customers
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and (
      public.current_user_role() <> 'CUSTOMER'
      or id = public.current_customer_id()
    )
  )
  with check ("organizationId" = public.current_org_id());

alter table public.transporters enable row level security;
create policy "transporters_org_isolation" on public.transporters
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and public.current_user_role() <> 'CUSTOMER'
  )
  with check ("organizationId" = public.current_org_id());

alter table public.shipments enable row level security;
create policy "shipments_isolation" on public.shipments
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and (
      public.current_user_role() <> 'CUSTOMER'
      or "customerId" = public.current_customer_id()
    )
  )
  with check ("organizationId" = public.current_org_id());

alter table public.shipment_timeline_events enable row level security;
create policy "shipment_timeline_events_isolation" on public.shipment_timeline_events
  for all to authenticated
  using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_timeline_events."shipmentId"
        and s."organizationId" = public.current_org_id()
        and (
          public.current_user_role() <> 'CUSTOMER'
          or s."customerId" = public.current_customer_id()
        )
    )
  );

alter table public.shipment_comments enable row level security;
create policy "shipment_comments_isolation" on public.shipment_comments
  for all to authenticated
  using (
    exists (
      select 1 from public.shipments s
      where s.id = shipment_comments."shipmentId"
        and s."organizationId" = public.current_org_id()
        and (
          public.current_user_role() <> 'CUSTOMER'
          or s."customerId" = public.current_customer_id()
        )
    )
  );

alter table public.invoices enable row level security;
create policy "invoices_isolation" on public.invoices
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and (
      public.current_user_role() <> 'CUSTOMER'
      or "customerId" = public.current_customer_id()
    )
  )
  with check ("organizationId" = public.current_org_id());

alter table public.invoice_versions enable row level security;
create policy "invoice_versions_isolation" on public.invoice_versions
  for all to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_versions."invoiceId"
        and i."organizationId" = public.current_org_id()
        and (
          public.current_user_role() <> 'CUSTOMER'
          or i."customerId" = public.current_customer_id()
        )
    )
  );

alter table public.truck_dispatches enable row level security;
create policy "truck_dispatches_isolation" on public.truck_dispatches
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and (
      public.current_user_role() <> 'CUSTOMER'
      or exists (
        select 1 from public.shipments s
        where s.id = truck_dispatches."shipmentId"
          and s."customerId" = public.current_customer_id()
      )
    )
  )
  with check ("organizationId" = public.current_org_id());

alter table public.factory_stuffings enable row level security;
create policy "factory_stuffings_isolation" on public.factory_stuffings
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and (
      public.current_user_role() <> 'CUSTOMER'
      or exists (
        select 1 from public.shipments s
        where s.id = factory_stuffings."shipmentId"
          and s."customerId" = public.current_customer_id()
      )
    )
  )
  with check ("organizationId" = public.current_org_id());

alter table public.gate_ins enable row level security;
create policy "gate_ins_isolation" on public.gate_ins
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and (
      public.current_user_role() <> 'CUSTOMER'
      or exists (
        select 1 from public.shipments s
        where s.id = gate_ins."shipmentId"
          and s."customerId" = public.current_customer_id()
      )
    )
  )
  with check ("organizationId" = public.current_org_id());

alter table public.shipping_instructions enable row level security;
create policy "shipping_instructions_isolation" on public.shipping_instructions
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and (
      public.current_user_role() <> 'CUSTOMER'
      or exists (
        select 1 from public.shipments s
        where s.id = shipping_instructions."shipmentId"
          and s."customerId" = public.current_customer_id()
      )
    )
  )
  with check ("organizationId" = public.current_org_id());

alter table public.bills_of_lading enable row level security;
create policy "bills_of_lading_isolation" on public.bills_of_lading
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and (
      public.current_user_role() <> 'CUSTOMER'
      or exists (
        select 1 from public.shipments s
        where s.id = bills_of_lading."shipmentId"
          and s."customerId" = public.current_customer_id()
      )
    )
  )
  with check ("organizationId" = public.current_org_id());

alter table public.bl_revisions enable row level security;
create policy "bl_revisions_isolation" on public.bl_revisions
  for all to authenticated
  using (
    exists (
      select 1 from public.bills_of_lading b
      join public.shipments s on s.id = b."shipmentId"
      where b.id = bl_revisions."billOfLadingId"
        and b."organizationId" = public.current_org_id()
        and (
          public.current_user_role() <> 'CUSTOMER'
          or s."customerId" = public.current_customer_id()
        )
    )
  );

alter table public.documents enable row level security;
create policy "documents_isolation" on public.documents
  for all to authenticated
  using (
    "organizationId" = public.current_org_id()
    and (
      public.current_user_role() <> 'CUSTOMER'
      or (
        "shipmentId" is not null
        and exists (
          select 1 from public.shipments s
          where s.id = documents."shipmentId"
            and s."customerId" = public.current_customer_id()
        )
      )
    )
  )
  with check ("organizationId" = public.current_org_id());

alter table public.notifications enable row level security;
create policy "notifications_owner" on public.notifications
  for all to authenticated
  using ("userId" = auth.uid()::text and "organizationId" = public.current_org_id())
  with check ("userId" = auth.uid()::text and "organizationId" = public.current_org_id());

alter table public.audit_logs enable row level security;
create policy "audit_logs_admin_read" on public.audit_logs
  for select to authenticated
  using (
    "organizationId" = public.current_org_id()
    and public.current_user_role() in ('ADMIN', 'EXPORT_MANAGER')
  );
