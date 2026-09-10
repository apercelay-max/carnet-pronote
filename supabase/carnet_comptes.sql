-- Table du compte Carnet (voir src/store/useAccountStore.ts).
--
-- À exécuter UNE FOIS dans le SQL Editor du projet Supabase
-- elyspjsyconovzczmzhm. À faire aussi, dans Authentication > Providers :
-- vérifier que « Email » est activé. Si « Confirm email » y est activé, un
-- compte tout juste créé doit d'abord confirmer son adresse avant de pouvoir
-- se connecter — l'app le dit explicitement, mais pour un usage perso on peut
-- désactiver cette confirmation.
--
-- Une ligne par compte. `data` contient l'instantané des clés AsyncStorage
-- synchronisées (préférences, animations, fiches, réglages de révision) — donc
-- jamais d'identifiants Pronote ni de clé Gemini : ceux-là restent dans le
-- stockage sécurisé de l'appareil.

create table if not exists public.carnet_comptes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.carnet_comptes enable row level security;

-- RLS : chaque compte ne voit et n'écrit QUE sa propre ligne. Sans ces
-- politiques, la clé publiable de l'app (qui est dans le bundle, donc lisible
-- par tout le monde) permettrait de lire les réglages de n'importe qui.
drop policy if exists "carnet_comptes_select_self" on public.carnet_comptes;
create policy "carnet_comptes_select_self"
  on public.carnet_comptes for select
  using (auth.uid() = user_id);

drop policy if exists "carnet_comptes_insert_self" on public.carnet_comptes;
create policy "carnet_comptes_insert_self"
  on public.carnet_comptes for insert
  with check (auth.uid() = user_id);

drop policy if exists "carnet_comptes_update_self" on public.carnet_comptes;
create policy "carnet_comptes_update_self"
  on public.carnet_comptes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "carnet_comptes_delete_self" on public.carnet_comptes;
create policy "carnet_comptes_delete_self"
  on public.carnet_comptes for delete
  using (auth.uid() = user_id);
