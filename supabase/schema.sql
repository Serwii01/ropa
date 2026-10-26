-- ropa · esquema de Supabase
-- Ejecuta este archivo completo en Supabase → SQL Editor.

-- ─── Prendas ────────────────────────────────────────────────
create table if not exists public.prendas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre      text,
  categoria   text not null,
  color       text,
  notas       text,
  image_path  text not null,
  created_at  timestamptz not null default now()
);
create index if not exists prendas_user_idx on public.prendas (user_id, created_at desc);

alter table public.prendas enable row level security;
drop policy if exists "prendas: solo las mías" on public.prendas;
create policy "prendas: solo las mías" on public.prendas
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ─── Combinaciones ──────────────────────────────────────────
create table if not exists public.outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre      text,
  created_at  timestamptz not null default now()
);
create index if not exists outfits_user_idx on public.outfits (user_id, created_at desc);

alter table public.outfits enable row level security;
drop policy if exists "outfits: solo los míos" on public.outfits;
create policy "outfits: solo los míos" on public.outfits
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.outfit_prendas (
  outfit_id  uuid not null references public.outfits (id) on delete cascade,
  prenda_id  uuid not null references public.prendas (id) on delete cascade,
  primary key (outfit_id, prenda_id)
);
create index if not exists outfit_prendas_prenda_idx on public.outfit_prendas (prenda_id);

alter table public.outfit_prendas enable row level security;
drop policy if exists "outfit_prendas: solo las mías" on public.outfit_prendas;
create policy "outfit_prendas: solo las mías" on public.outfit_prendas
  for all
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid()))
    and exists (select 1 from public.prendas p where p.id = prenda_id and p.user_id = (select auth.uid()))
  );

-- ─── Storage: bucket privado, una carpeta por usuario ───────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prendas', 'prendas', false, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "prendas storage: leer las mías" on storage.objects;
create policy "prendas storage: leer las mías" on storage.objects
  for select using (bucket_id = 'prendas' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "prendas storage: subir las mías" on storage.objects;
create policy "prendas storage: subir las mías" on storage.objects
  for insert with check (bucket_id = 'prendas' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "prendas storage: borrar las mías" on storage.objects;
create policy "prendas storage: borrar las mías" on storage.objects
  for delete using (bucket_id = 'prendas' and (storage.foldername(name))[1] = (select auth.uid())::text);
