-- Avancée : base de données Supabase.
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis « Run ».
-- Peut être relancé sans risque : il ne supprime aucune donnée.
--
-- Qui voit quoi :
--   * chaque personne a son propre espace (espaces, projets, Inbox, clients, montants, réglages) ;
--   * un projet peut être partagé à une adresse e-mail en « editor » (éditeur) ou « viewer » (lecteur) ;
--   * les clients, les montants et les notes privées ne sont jamais visibles par les invités.

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,  -- vide = tâche de l'Inbox
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_owner_idx on public.tasks(owner);
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- infos privées d'un projet : client, montant, encaissé, notes privées
create table if not exists public.meta (
  project_id uuid primary key references public.projects(id) on delete cascade,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.settings (
  owner uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- partage d'un projet avec une adresse e-mail
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role text not null check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, email)
);
create index if not exists members_email_idx on public.members(email);

-- ---------- fonctions d'accès ----------
create or replace function public.my_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- rôle de la personne connectée sur un projet : 'owner', 'editor', 'viewer' ou rien
create or replace function public.project_role(pid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.projects p where p.id = pid and p.owner = auth.uid()) then 'owner'
    else (select m.role from public.members m
          where m.project_id = pid and m.email = public.my_email() and public.my_email() <> '' limit 1)
  end
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end
$$;
do $$
declare t text;
begin
  foreach t in array array['spaces','projects','tasks','clients','meta','settings'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- droits ----------
alter table public.spaces   enable row level security;
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;
alter table public.clients  enable row level security;
alter table public.meta     enable row level security;
alter table public.settings enable row level security;
alter table public.members  enable row level security;

-- personne n'accède à rien sans être connecté
revoke all on public.spaces, public.projects, public.tasks, public.clients, public.meta, public.settings, public.members from anon;
grant select, insert, delete on public.spaces, public.projects, public.tasks, public.clients, public.meta, public.settings, public.members to authenticated;
-- un éditeur invité ne peut modifier que le contenu, jamais le propriétaire d'une ligne
revoke update on public.spaces, public.projects, public.tasks, public.clients, public.meta, public.settings, public.members from authenticated;
grant update (data) on public.spaces, public.projects, public.clients, public.meta, public.settings to authenticated;
grant update (data, project_id) on public.tasks to authenticated;
grant update (role) on public.members to authenticated;
grant execute on function public.my_email(), public.project_role(uuid) to authenticated;

-- espaces, clients, réglages, infos privées : uniquement leur propriétaire
drop policy if exists own_all on public.spaces;
create policy own_all on public.spaces for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists own_all on public.clients;
create policy own_all on public.clients for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists own_all on public.settings;
create policy own_all on public.settings for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists own_all on public.meta;
create policy own_all on public.meta for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid() and public.project_role(project_id) = 'owner');

-- projets : lus par le propriétaire et les invités, modifiés par le propriétaire et les éditeurs
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated
  using (owner = auth.uid() or public.project_role(id) is not null);
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated
  with check (owner = auth.uid());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (public.project_role(id) in ('owner','editor'))
  with check (public.project_role(id) in ('owner','editor'));
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated
  using (owner = auth.uid());

-- tâches : celles de l'Inbox sont à leur auteur ; celles d'un projet suivent le rôle sur le projet
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated
  using ((project_id is null and owner = auth.uid())
      or (project_id is not null and public.project_role(project_id) is not null));
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (owner = auth.uid()
      and (project_id is null or public.project_role(project_id) in ('owner','editor')));
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using ((project_id is null and owner = auth.uid())
      or (project_id is not null and public.project_role(project_id) in ('owner','editor')))
  with check ((project_id is null and owner = auth.uid())
      or (project_id is not null and public.project_role(project_id) in ('owner','editor')));
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using ((project_id is null and owner = auth.uid())
      or (project_id is not null and public.project_role(project_id) in ('owner','editor')));

-- partages : gérés par le propriétaire du projet ; chacun voit les siens
drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated
  using (public.project_role(project_id) = 'owner' or email = public.my_email());
drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated
  with check (public.project_role(project_id) = 'owner');
drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated
  using (public.project_role(project_id) = 'owner')
  with check (public.project_role(project_id) = 'owner');
drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated
  using (public.project_role(project_id) = 'owner');

-- ---------- photos des tâches ----------
-- rôle de la personne connectée sur une tâche : 'owner', 'editor', 'viewer' ou rien
create or replace function public.task_role(tid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when t.project_id is null then case when t.owner = auth.uid() then 'owner' end
    else public.project_role(t.project_id)
  end
  from public.tasks t where t.id = tid
$$;
-- une photo est rangée dans « <identifiant de la tâche>/<nom du fichier> »
create or replace function public.photo_task(name text) returns uuid
language plpgsql immutable as $$
begin
  return split_part(name, '/', 1)::uuid;
exception when others then
  return null;
end $$;
grant execute on function public.task_role(uuid), public.photo_task(text) to authenticated;

-- espaces de stockage privés : photos (5 Mo par image) et fichiers joints (25 Mo par fichier)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fichiers', 'fichiers', false, 26214400, null)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- même règle pour les photos et les fichiers : on voit ceux des tâches qu'on a le droit de voir (et celles qu'on a envoyées soi-même) ;
-- on en ajoute là où on a le droit de modifier
drop policy if exists avancee_photos_read on storage.objects;
create policy avancee_photos_read on storage.objects for select to authenticated
  using (bucket_id in ('photos','fichiers')
     and (owner_id = auth.uid()::text or public.task_role(public.photo_task(name)) is not null));
drop policy if exists avancee_photos_insert on storage.objects;
create policy avancee_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('photos','fichiers') and public.task_role(public.photo_task(name)) in ('owner','editor'));
drop policy if exists avancee_photos_delete on storage.objects;
create policy avancee_photos_delete on storage.objects for delete to authenticated
  using (bucket_id in ('photos','fichiers')
     and (owner_id = auth.uid()::text or public.task_role(public.photo_task(name)) in ('owner','editor')));

-- mises à jour en direct (ignoré si déjà activé)
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['spaces','projects','tasks','clients','meta','settings','members'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;
