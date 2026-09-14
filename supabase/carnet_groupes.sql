-- Groupes de classe (voir src/lib/groupes.ts et src/store/useGroupesStore.ts).
--
-- À exécuter UNE FOIS dans le SQL Editor du projet Supabase
-- elyspjsyconovzczmzhm, APRÈS carnet_comptes.sql (les groupes reposent sur le
-- même Compte Carnet : auth.users). Le script est ré-exécutable : tables en
-- « if not exists », politiques supprimées puis recréées.
--
-- Principe de sécurité, à garder en tête avant de toucher à quoi que ce soit :
-- la clé publiable de l'app est dans le bundle web, donc lisible par tout le
-- monde. La SEULE barrière entre un inconnu et le chat d'une classe, ce sont
-- les politiques RLS ci-dessous. Règle unique : on ne lit et on n'écrit les
-- données d'un groupe que si on en est membre. Et on ne devient membre QUE par
-- les fonctions carnet_groupe_creer / carnet_groupe_rejoindre (il n'existe
-- volontairement aucune politique d'insertion directe dans les membres).
--
-- Pseudo plutôt qu'email : l'email du compte n'est jamais montré aux autres
-- membres. Chacun choisit le nom sous lequel la classe le voit.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.carnet_groupes (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null check (char_length(btrim(nom)) between 1 and 40),
  -- 8 caractères sans 0/O/1/I/L : court à dicter en classe, mais assez long
  -- (31^8 ≈ 850 milliards) pour qu'on ne tombe pas sur un groupe au hasard.
  code       text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  cree_par   uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.carnet_groupes_membres (
  groupe_id uuid not null references public.carnet_groupes (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  pseudo    text not null check (char_length(btrim(pseudo)) between 1 and 30),
  role      text not null default 'membre' check (role in ('admin', 'membre')),
  joined_at timestamptz not null default now(),
  primary key (groupe_id, user_id)
);
create index if not exists carnet_groupes_membres_user_idx
  on public.carnet_groupes_membres (user_id);

create table if not exists public.carnet_groupes_messages (
  id         uuid primary key default gen_random_uuid(),
  groupe_id  uuid not null references public.carnet_groupes (id) on delete cascade,
  auteur_id  uuid default auth.uid() references auth.users (id) on delete set null,
  type       text not null default 'texte' check (type in ('texte', 'devoir')),
  texte      text check (texte is null or char_length(texte) <= 2000),
  -- Carte « devoir partagé » : { matiere, titre, date (AAAA-MM-JJ), note }.
  -- Une copie figée plutôt qu'un lien vers le devoir d'origine : le devoir
  -- Pronote d'un élève n'existe pas dans la base, et un devoir perso peut être
  -- supprimé par son auteur sans que la carte disparaisse du fil.
  devoir     jsonb check (devoir is null or pg_column_size(devoir) < 8000),
  created_at timestamptz not null default now(),
  check (
    (type = 'texte' and texte is not null and char_length(btrim(texte)) > 0)
    or (type = 'devoir' and devoir is not null)
  )
);
create index if not exists carnet_groupes_messages_groupe_idx
  on public.carnet_groupes_messages (groupe_id, created_at desc);

create table if not exists public.carnet_groupes_evenements (
  id          uuid primary key default gen_random_uuid(),
  groupe_id   uuid not null references public.carnet_groupes (id) on delete cascade,
  auteur_id   uuid default auth.uid() references auth.users (id) on delete set null,
  titre       text not null check (char_length(btrim(titre)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  debut       timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists carnet_groupes_evenements_groupe_idx
  on public.carnet_groupes_evenements (groupe_id, debut);

create table if not exists public.carnet_groupes_devoirs (
  id          uuid primary key default gen_random_uuid(),
  groupe_id   uuid not null references public.carnet_groupes (id) on delete cascade,
  auteur_id   uuid default auth.uid() references auth.users (id) on delete set null,
  matiere     text not null default '' check (char_length(matiere) <= 60),
  echeance    date not null,
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  created_at  timestamptz not null default now(),
  -- Sert de cible à la clé étrangère composée de l'état par membre : elle
  -- garantit qu'on ne peut pas rattacher un « fait » à un devoir d'un AUTRE
  -- groupe en trichant sur groupe_id.
  unique (id, groupe_id)
);
create index if not exists carnet_groupes_devoirs_groupe_idx
  on public.carnet_groupes_devoirs (groupe_id, echeance);

-- État « fait » PAR MEMBRE. Une ligne qu'on met à jour (fait = true/false)
-- plutôt qu'une ligne qu'on supprime en décochant : Supabase Realtime ne sait
-- pas filtrer les suppressions par groupe, alors qu'il filtre très bien les
-- mises à jour.
create table if not exists public.carnet_groupes_devoirs_faits (
  devoir_id  uuid not null,
  groupe_id  uuid not null,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fait       boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (devoir_id, user_id),
  foreign key (devoir_id, groupe_id)
    references public.carnet_groupes_devoirs (id, groupe_id) on delete cascade
);
create index if not exists carnet_groupes_devoirs_faits_groupe_idx
  on public.carnet_groupes_devoirs_faits (groupe_id);

create table if not exists public.carnet_groupes_controles (
  id         uuid primary key default gen_random_uuid(),
  groupe_id  uuid not null references public.carnet_groupes (id) on delete cascade,
  auteur_id  uuid default auth.uid() references auth.users (id) on delete set null,
  matiere    text not null check (char_length(btrim(matiere)) between 1 and 60),
  date       date not null,
  chapitre   text not null default '' check (char_length(chapitre) <= 120),
  created_at timestamptz not null default now(),
  unique (id, groupe_id)
);
create index if not exists carnet_groupes_controles_groupe_idx
  on public.carnet_groupes_controles (groupe_id, date);

-- Fiche partagée : une COPIE de la fiche générée (titre, matière, contenu
-- extrait). Pas le texte source complet — inutile pour réviser, et c'est
-- parfois un cours entier recopié. La fiche d'origine reste sur l'appareil de
-- son auteur et peut évoluer sans modifier ce qui a été partagé.
create table if not exists public.carnet_groupes_fiches (
  id          uuid primary key default gen_random_uuid(),
  controle_id uuid not null,
  groupe_id   uuid not null,
  auteur_id   uuid default auth.uid() references auth.users (id) on delete set null,
  titre       text not null check (char_length(btrim(titre)) between 1 and 120),
  matiere     text not null default '' check (char_length(matiere) <= 60),
  genere      jsonb not null check (pg_column_size(genere) < 200000),
  created_at  timestamptz not null default now(),
  foreign key (controle_id, groupe_id)
    references public.carnet_groupes_controles (id, groupe_id) on delete cascade
);
create index if not exists carnet_groupes_fiches_controle_idx
  on public.carnet_groupes_fiches (controle_id);

-- Un score par membre et par contrôle : le dernier résultat, le meilleur
-- pourcentage et le nombre de parties. Pas d'historique complet — le
-- classement n'en a pas besoin et ça évite une table qui grossit à l'infini.
create table if not exists public.carnet_groupes_scores (
  controle_id   uuid not null,
  groupe_id     uuid not null,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dernier_score integer not null check (dernier_score >= 0),
  dernier_total integer not null check (dernier_total > 0 and dernier_score <= dernier_total),
  meilleur_pct  integer not null check (meilleur_pct between 0 and 100),
  parties       integer not null default 1 check (parties >= 1),
  updated_at    timestamptz not null default now(),
  primary key (controle_id, user_id),
  foreign key (controle_id, groupe_id)
    references public.carnet_groupes_controles (id, groupe_id) on delete cascade
);
create index if not exists carnet_groupes_scores_groupe_idx
  on public.carnet_groupes_scores (groupe_id);

-- ---------------------------------------------------------------------------
-- Fonctions d'appartenance
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER exprès : une politique RLS sur carnet_groupes_membres qui
-- interrogerait carnet_groupes_membres se rappellerait elle-même à l'infini
-- (« infinite recursion detected in policy »). Ces fonctions lisent la table
-- sans repasser par la RLS, et ne renvoient qu'un booléen sur l'utilisateur
-- COURANT : elles ne permettent de rien apprendre sur les autres.

create or replace function public.carnet_est_membre(p_groupe uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.carnet_groupes_membres
    where groupe_id = p_groupe and user_id = auth.uid()
  );
$$;

create or replace function public.carnet_est_admin(p_groupe uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.carnet_groupes_membres
    where groupe_id = p_groupe and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC : créer, rejoindre, quitter, enregistrer un score
-- ---------------------------------------------------------------------------
-- Les erreurs sont levées avec un code court (« code_invalide », …) que
-- l'app traduit en français (voir messageErreurGroupe dans src/lib/groupes.ts).

create or replace function public.carnet_groupe_generer_code()
returns text
language plpgsql volatile
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  octets bytea := extensions.gen_random_bytes(8);
  out_code text := '';
begin
  -- gen_random_bytes plutôt que random() : random() est prévisible, et un
  -- code prévisible, c'est une classe dont on peut deviner l'invitation.
  for i in 0..7 loop
    out_code := out_code || substr(alphabet, 1 + (get_byte(octets, i) % 31), 1);
  end loop;
  return out_code;
end;
$$;

create or replace function public.carnet_groupe_creer(p_nom text, p_pseudo text)
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_nom text := btrim(coalesce(p_nom, ''));
  v_pseudo text := btrim(coalesce(p_pseudo, ''));
  v_code text;
  v_groupe uuid;
begin
  if v_uid is null then raise exception 'non_connecte'; end if;
  if char_length(v_nom) not between 1 and 40 then raise exception 'nom_invalide'; end if;
  if char_length(v_pseudo) not between 1 and 30 then raise exception 'pseudo_invalide'; end if;
  -- Garde-fou anti-abus : personne n'a besoin de créer 20 groupes.
  if (select count(*) from public.carnet_groupes where cree_par = v_uid) >= 20 then
    raise exception 'trop_de_groupes';
  end if;

  -- Collision de code quasi impossible, mais on boucle quand même plutôt que
  -- de laisser l'unicité faire échouer la création.
  loop
    v_code := public.carnet_groupe_generer_code();
    exit when not exists (select 1 from public.carnet_groupes where code = v_code);
  end loop;

  insert into public.carnet_groupes (nom, code, cree_par)
  values (v_nom, v_code, v_uid)
  returning id into v_groupe;

  insert into public.carnet_groupes_membres (groupe_id, user_id, pseudo, role)
  values (v_groupe, v_uid, v_pseudo, 'admin');

  return v_groupe;
end;
$$;

create or replace function public.carnet_groupe_rejoindre(p_code text, p_pseudo text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_pseudo text := btrim(coalesce(p_pseudo, ''));
  v_groupe uuid;
begin
  if v_uid is null then raise exception 'non_connecte'; end if;
  if char_length(v_pseudo) not between 1 and 30 then raise exception 'pseudo_invalide'; end if;

  select id into v_groupe from public.carnet_groupes where code = v_code;
  if v_groupe is null then raise exception 'code_invalide'; end if;

  -- Déjà membre : on met juste le pseudo à jour, rejoindre deux fois n'est
  -- pas une erreur (lien d'invitation ouvert deux fois, par exemple).
  if not exists (
    select 1 from public.carnet_groupes_membres where groupe_id = v_groupe and user_id = v_uid
  ) and (select count(*) from public.carnet_groupes_membres where groupe_id = v_groupe) >= 60 then
    raise exception 'groupe_plein';
  end if;

  insert into public.carnet_groupes_membres (groupe_id, user_id, pseudo, role)
  values (v_groupe, v_uid, v_pseudo, 'membre')
  on conflict (groupe_id, user_id) do update set pseudo = excluded.pseudo;

  return v_groupe;
end;
$$;

create or replace function public.carnet_groupe_quitter(p_groupe uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_etait_admin boolean;
begin
  if v_uid is null then raise exception 'non_connecte'; end if;

  delete from public.carnet_groupes_membres
  where groupe_id = p_groupe and user_id = v_uid
  returning role = 'admin' into v_etait_admin;

  if v_etait_admin is null then return; end if;

  if not exists (select 1 from public.carnet_groupes_membres where groupe_id = p_groupe) then
    -- Dernier membre parti : le groupe (et tout son contenu, en cascade) est
    -- supprimé. Sinon il resterait une coquille illisible par tout le monde.
    delete from public.carnet_groupes where id = p_groupe;
  elsif v_etait_admin and not exists (
    select 1 from public.carnet_groupes_membres where groupe_id = p_groupe and role = 'admin'
  ) then
    -- L'admin s'en va : le membre le plus ancien reprend le rôle, pour qu'il
    -- reste toujours quelqu'un capable de faire le ménage.
    update public.carnet_groupes_membres set role = 'admin'
    where (groupe_id, user_id) = (
      select groupe_id, user_id from public.carnet_groupes_membres
      where groupe_id = p_groupe order by joined_at asc limit 1
    );
  end if;
end;
$$;

-- SECURITY INVOKER : la RLS s'applique. Si on n'est pas membre, le select sur
-- le contrôle ne renvoie rien et la fonction échoue. Passer par une fonction
-- sert uniquement à calculer « meilleur » et « parties » côté serveur, ce que
-- l'upsert de l'API REST ne sait pas faire.
create or replace function public.carnet_groupe_score(p_controle uuid, p_score integer, p_total integer)
returns void
language plpgsql security invoker
set search_path = public
as $$
declare
  v_groupe uuid;
  v_pct integer;
begin
  if auth.uid() is null then raise exception 'non_connecte'; end if;
  select groupe_id into v_groupe from public.carnet_groupes_controles where id = p_controle;
  if v_groupe is null then raise exception 'controle_introuvable'; end if;
  if p_total is null or p_total <= 0 or p_score is null or p_score < 0 or p_score > p_total then
    raise exception 'score_invalide';
  end if;
  v_pct := round(100.0 * p_score / p_total);

  insert into public.carnet_groupes_scores as s
    (controle_id, groupe_id, user_id, dernier_score, dernier_total, meilleur_pct, parties, updated_at)
  values (p_controle, v_groupe, auth.uid(), p_score, p_total, v_pct, 1, now())
  on conflict (controle_id, user_id) do update set
    dernier_score = excluded.dernier_score,
    dernier_total = excluded.dernier_total,
    meilleur_pct  = greatest(s.meilleur_pct, excluded.meilleur_pct),
    parties       = s.parties + 1,
    updated_at    = now();
end;
$$;

-- Personne de non connecté n'a à appeler ces fonctions.
revoke all on function public.carnet_est_membre(uuid) from public, anon;
revoke all on function public.carnet_est_admin(uuid) from public, anon;
revoke all on function public.carnet_groupe_generer_code() from public, anon, authenticated;
revoke all on function public.carnet_groupe_creer(text, text) from public, anon;
revoke all on function public.carnet_groupe_rejoindre(text, text) from public, anon;
revoke all on function public.carnet_groupe_quitter(uuid) from public, anon;
revoke all on function public.carnet_groupe_score(uuid, integer, integer) from public, anon;
grant execute on function public.carnet_est_membre(uuid) to authenticated;
grant execute on function public.carnet_est_admin(uuid) to authenticated;
grant execute on function public.carnet_groupe_creer(text, text) to authenticated;
grant execute on function public.carnet_groupe_rejoindre(text, text) to authenticated;
grant execute on function public.carnet_groupe_quitter(uuid) to authenticated;
grant execute on function public.carnet_groupe_score(uuid, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.carnet_groupes              enable row level security;
alter table public.carnet_groupes_membres      enable row level security;
alter table public.carnet_groupes_messages     enable row level security;
alter table public.carnet_groupes_evenements   enable row level security;
alter table public.carnet_groupes_devoirs      enable row level security;
alter table public.carnet_groupes_devoirs_faits enable row level security;
alter table public.carnet_groupes_controles    enable row level security;
alter table public.carnet_groupes_fiches       enable row level security;
alter table public.carnet_groupes_scores       enable row level security;

-- Groupes : lecture par les membres, renommage et suppression par un admin.
-- Pas d'insertion directe : la création passe par carnet_groupe_creer, qui
-- inscrit l'auteur comme admin dans la même transaction.
drop policy if exists "groupes_select" on public.carnet_groupes;
create policy "groupes_select" on public.carnet_groupes for select
  to authenticated using (public.carnet_est_membre(id));
drop policy if exists "groupes_update" on public.carnet_groupes;
create policy "groupes_update" on public.carnet_groupes for update
  to authenticated using (public.carnet_est_admin(id)) with check (public.carnet_est_admin(id));
drop policy if exists "groupes_delete" on public.carnet_groupes;
create policy "groupes_delete" on public.carnet_groupes for delete
  to authenticated using (public.carnet_est_admin(id));

-- Membres : on voit les membres de SES groupes. Un admin peut retirer
-- quelqu'un. Ni insertion ni mise à jour directes : sans ça, un membre
-- pourrait se passer lui-même « admin ». Changer de pseudo = rappeler
-- carnet_groupe_rejoindre avec le même code, qui ne touche jamais au rôle.
drop policy if exists "membres_select" on public.carnet_groupes_membres;
create policy "membres_select" on public.carnet_groupes_membres for select
  to authenticated using (public.carnet_est_membre(groupe_id));
drop policy if exists "membres_update_self" on public.carnet_groupes_membres;
drop policy if exists "membres_delete_admin" on public.carnet_groupes_membres;
create policy "membres_delete_admin" on public.carnet_groupes_membres for delete
  to authenticated using (public.carnet_est_admin(groupe_id));

-- Messages : lecture par les membres, écriture en son propre nom, suppression
-- de ses propres messages (ou par un admin, pour la modération).
drop policy if exists "messages_select" on public.carnet_groupes_messages;
create policy "messages_select" on public.carnet_groupes_messages for select
  to authenticated using (public.carnet_est_membre(groupe_id));
drop policy if exists "messages_insert" on public.carnet_groupes_messages;
create policy "messages_insert" on public.carnet_groupes_messages for insert
  to authenticated
  with check (auteur_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "messages_delete" on public.carnet_groupes_messages;
create policy "messages_delete" on public.carnet_groupes_messages for delete
  to authenticated
  using (auteur_id = (select auth.uid()) or public.carnet_est_admin(groupe_id));

-- Événements, devoirs collectifs, contrôles : même modèle. Tout membre lit et
-- crée ; l'auteur modifie ; l'auteur ou un admin supprime.
drop policy if exists "evenements_select" on public.carnet_groupes_evenements;
create policy "evenements_select" on public.carnet_groupes_evenements for select
  to authenticated using (public.carnet_est_membre(groupe_id));
drop policy if exists "evenements_insert" on public.carnet_groupes_evenements;
create policy "evenements_insert" on public.carnet_groupes_evenements for insert
  to authenticated
  with check (auteur_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "evenements_update" on public.carnet_groupes_evenements;
create policy "evenements_update" on public.carnet_groupes_evenements for update
  to authenticated
  using (auteur_id = (select auth.uid()))
  with check (auteur_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "evenements_delete" on public.carnet_groupes_evenements;
create policy "evenements_delete" on public.carnet_groupes_evenements for delete
  to authenticated
  using (auteur_id = (select auth.uid()) or public.carnet_est_admin(groupe_id));

drop policy if exists "devoirs_select" on public.carnet_groupes_devoirs;
create policy "devoirs_select" on public.carnet_groupes_devoirs for select
  to authenticated using (public.carnet_est_membre(groupe_id));
drop policy if exists "devoirs_insert" on public.carnet_groupes_devoirs;
create policy "devoirs_insert" on public.carnet_groupes_devoirs for insert
  to authenticated
  with check (auteur_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "devoirs_update" on public.carnet_groupes_devoirs;
create policy "devoirs_update" on public.carnet_groupes_devoirs for update
  to authenticated
  using (auteur_id = (select auth.uid()))
  with check (auteur_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "devoirs_delete" on public.carnet_groupes_devoirs;
create policy "devoirs_delete" on public.carnet_groupes_devoirs for delete
  to authenticated
  using (auteur_id = (select auth.uid()) or public.carnet_est_admin(groupe_id));

-- État « fait » : tout le groupe le lit (c'est le « 12 l'ont fait »), mais
-- chacun n'écrit QUE sa propre ligne.
drop policy if exists "faits_select" on public.carnet_groupes_devoirs_faits;
create policy "faits_select" on public.carnet_groupes_devoirs_faits for select
  to authenticated using (public.carnet_est_membre(groupe_id));
drop policy if exists "faits_insert" on public.carnet_groupes_devoirs_faits;
create policy "faits_insert" on public.carnet_groupes_devoirs_faits for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "faits_update" on public.carnet_groupes_devoirs_faits;
create policy "faits_update" on public.carnet_groupes_devoirs_faits for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));

drop policy if exists "controles_select" on public.carnet_groupes_controles;
create policy "controles_select" on public.carnet_groupes_controles for select
  to authenticated using (public.carnet_est_membre(groupe_id));
drop policy if exists "controles_insert" on public.carnet_groupes_controles;
create policy "controles_insert" on public.carnet_groupes_controles for insert
  to authenticated
  with check (auteur_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "controles_update" on public.carnet_groupes_controles;
create policy "controles_update" on public.carnet_groupes_controles for update
  to authenticated
  using (auteur_id = (select auth.uid()))
  with check (auteur_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "controles_delete" on public.carnet_groupes_controles;
create policy "controles_delete" on public.carnet_groupes_controles for delete
  to authenticated
  using (auteur_id = (select auth.uid()) or public.carnet_est_admin(groupe_id));

drop policy if exists "fiches_select" on public.carnet_groupes_fiches;
create policy "fiches_select" on public.carnet_groupes_fiches for select
  to authenticated using (public.carnet_est_membre(groupe_id));
drop policy if exists "fiches_insert" on public.carnet_groupes_fiches;
create policy "fiches_insert" on public.carnet_groupes_fiches for insert
  to authenticated
  with check (auteur_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "fiches_delete" on public.carnet_groupes_fiches;
create policy "fiches_delete" on public.carnet_groupes_fiches for delete
  to authenticated
  using (auteur_id = (select auth.uid()) or public.carnet_est_admin(groupe_id));

-- Scores : lisibles par le groupe (classement), écrits uniquement pour soi.
-- Limite assumée : un score est déclaré par l'appareil de l'élève. Quelqu'un
-- de motivé peut tricher en appelant l'API à la main ; pour un classement
-- entre camarades, ce n'est pas un enjeu qui justifie un quiz corrigé serveur.
drop policy if exists "scores_select" on public.carnet_groupes_scores;
create policy "scores_select" on public.carnet_groupes_scores for select
  to authenticated using (public.carnet_est_membre(groupe_id));
drop policy if exists "scores_insert" on public.carnet_groupes_scores;
create policy "scores_insert" on public.carnet_groupes_scores for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));
drop policy if exists "scores_update" on public.carnet_groupes_scores;
create policy "scores_update" on public.carnet_groupes_scores for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.carnet_est_membre(groupe_id));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- Les messages (le chat), l'état « fait » des devoirs et les scores arrivent
-- en direct. Realtime applique la RLS de SELECT ci-dessus avant de diffuser
-- une ligne : un non-membre abonné au canal d'un groupe ne reçoit rien.
-- Les événements, devoirs et contrôles se rechargent à l'ouverture de l'onglet
-- — ils changent rarement, pas besoin de garder un flux ouvert pour eux.

do $$
declare
  t text;
begin
  foreach t in array array[
    'carnet_groupes_messages',
    'carnet_groupes_devoirs_faits',
    'carnet_groupes_scores'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
