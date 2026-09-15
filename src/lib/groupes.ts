// Accès aux données des Groupes de classe (tables décrites dans
// supabase/carnet_groupes.sql).
//
// Réutilise le client du Compte Carnet (getSupabase) plutôt que celui de
// lib/sync.ts : toutes les tables de groupe sont protégées par une RLS qui
// s'appuie sur `auth.uid()`. Sans session, chaque requête reviendrait vide.
//
// Ce fichier ne garde AUCUN état : il traduit entre les lignes Supabase
// (snake_case, dates en chaîne) et les types de l'app. L'état vit dans
// src/store/useGroupesStore.ts.
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, messageErreur } from "./supabaseAuth";
import type { FicheGeneree } from "./fiches";

// --- Types ----------------------------------------------------------------

export type RoleMembre = "admin" | "membre";

export type Groupe = {
  id: string;
  nom: string;
  code: string;
  creePar: string | null;
  createdAt: string;
};

/** Un groupe tel qu'il apparaît dans « Mes groupes ». */
export type MonGroupe = Groupe & { monRole: RoleMembre; monPseudo: string };

export type Membre = {
  userId: string;
  pseudo: string;
  role: RoleMembre;
  joinedAt: string;
};

/** Contenu figé d'une carte « devoir partagé » dans le chat. */
export type DevoirPartage = {
  matiere: string;
  titre: string;
  /** "AAAA-MM-JJ" */
  date: string;
  note: string;
};

export type MessageGroupe = {
  id: string;
  groupeId: string;
  auteurId: string | null;
  type: "texte" | "devoir";
  texte: string | null;
  devoir: DevoirPartage | null;
  createdAt: string;
};

export type EvenementGroupe = {
  id: string;
  groupeId: string;
  auteurId: string | null;
  titre: string;
  description: string;
  /** ISO complet (date + heure). */
  debut: string;
  createdAt: string;
};

export type EtatFait = { userId: string; fait: boolean };

export type DevoirGroupe = {
  id: string;
  groupeId: string;
  auteurId: string | null;
  matiere: string;
  /** "AAAA-MM-JJ" */
  echeance: string;
  description: string;
  createdAt: string;
  faits: EtatFait[];
};

export type ControleGroupe = {
  id: string;
  groupeId: string;
  auteurId: string | null;
  matiere: string;
  /** "AAAA-MM-JJ" */
  date: string;
  chapitre: string;
  createdAt: string;
};

export type FichePartagee = {
  id: string;
  controleId: string;
  groupeId: string;
  auteurId: string | null;
  titre: string;
  matiere: string;
  genere: FicheGeneree;
  /** Version Gemini, si l'auteur l'avait générée : le quiz commun s'en sert en priorité. */
  ia?: import("./ficheGemini").FicheIA;
  createdAt: string;
};

export type ScoreGroupe = {
  controleId: string;
  groupeId: string;
  userId: string;
  dernierScore: number;
  dernierTotal: number;
  meilleurPct: number;
  parties: number;
  updatedAt: string;
};

// --- Codes d'invitation ---------------------------------------------------

/**
 * Nettoie un code saisi à la main : majuscules, sans espaces ni tirets.
 * Les codes sont AFFICHÉS en deux blocs (« ABCD EFGH ») pour être dictés
 * facilement en classe ; on doit donc accepter aussi bien « abcd-efgh ».
 */
export function normaliserCode(brut: string): string {
  return brut.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formaterCode(code: string): string {
  const c = normaliserCode(code);
  return c.length === 8 ? `${c.slice(0, 4)} ${c.slice(4)}` : c;
}

/** Lien à partager : ouvre directement l'écran « rejoindre » avec le code rempli. */
export function lienInvitation(code: string): string {
  return `https://carnet-pronote.vercel.app/groupes?code=${normaliserCode(code)}`;
}

// --- Erreurs --------------------------------------------------------------

/**
 * Les RPC lèvent des codes courts (voir carnet_groupes.sql) ; les autres
 * erreurs sont celles de Supabase, déjà traduites par messageErreur.
 */
export function messageErreurGroupe(err: unknown): string {
  const brut = (err as any)?.message ?? String(err);
  const m = String(brut).toLowerCase();
  if (m.includes("code_invalide")) return "Aucun groupe avec ce code. Vérifie les 8 caractères.";
  if (m.includes("pseudo_invalide")) return "Choisis un pseudo (30 caractères maximum).";
  if (m.includes("nom_invalide")) return "Le nom du groupe doit faire entre 1 et 40 caractères.";
  if (m.includes("groupe_plein")) return "Ce groupe est complet (60 membres maximum).";
  if (m.includes("trop_de_groupes")) return "Tu as déjà créé 20 groupes : c'est le maximum.";
  if (m.includes("non_connecte") || m.includes("jwt"))
    return "Ta session du compte Carnet a expiré. Reconnecte-toi.";
  if (m.includes("controle_introuvable")) return "Ce contrôle n'existe plus.";
  if (m.includes("score_invalide")) return "Score impossible à enregistrer.";
  // Table absente : le SQL n'a pas encore été exécuté sur le projet. Mieux
  // vaut le dire clairement qu'afficher « relation does not exist ».
  if (m.includes("does not exist") || m.includes("could not find the"))
    return "Les groupes ne sont pas encore activés sur le serveur (script SQL à exécuter).";
  return messageErreur(String(brut));
}

/** Lève l'erreur Supabase si présente, sinon renvoie les données. */
function verifier<T>(res: { data: T; error: any }): T {
  if (res.error) throw res.error;
  return res.data;
}

// --- Conversions ligne -> type --------------------------------------------

function versGroupe(r: any): Groupe {
  return { id: r.id, nom: r.nom, code: r.code, creePar: r.cree_par ?? null, createdAt: r.created_at };
}

function versMessage(r: any): MessageGroupe {
  return {
    id: r.id,
    groupeId: r.groupe_id,
    auteurId: r.auteur_id ?? null,
    type: r.type === "devoir" ? "devoir" : "texte",
    texte: r.texte ?? null,
    devoir: r.devoir ?? null,
    createdAt: r.created_at,
  };
}

function versEvenement(r: any): EvenementGroupe {
  return {
    id: r.id,
    groupeId: r.groupe_id,
    auteurId: r.auteur_id ?? null,
    titre: r.titre,
    description: r.description ?? "",
    debut: r.debut,
    createdAt: r.created_at,
  };
}

function versDevoir(r: any): DevoirGroupe {
  return {
    id: r.id,
    groupeId: r.groupe_id,
    auteurId: r.auteur_id ?? null,
    matiere: r.matiere ?? "",
    echeance: r.echeance,
    description: r.description,
    createdAt: r.created_at,
    faits: (r.carnet_groupes_devoirs_faits ?? []).map((f: any) => ({ userId: f.user_id, fait: !!f.fait })),
  };
}

function versControle(r: any): ControleGroupe {
  return {
    id: r.id,
    groupeId: r.groupe_id,
    auteurId: r.auteur_id ?? null,
    matiere: r.matiere,
    date: r.date,
    chapitre: r.chapitre ?? "",
    createdAt: r.created_at,
  };
}

function versFiche(r: any): FichePartagee {
  return {
    id: r.id,
    controleId: r.controle_id,
    groupeId: r.groupe_id,
    auteurId: r.auteur_id ?? null,
    titre: r.titre,
    matiere: r.matiere ?? "",
    genere: r.genere,
    ia: r.genere?.ia,
    createdAt: r.created_at,
  };
}

export function versScore(r: any): ScoreGroupe {
  return {
    controleId: r.controle_id,
    groupeId: r.groupe_id,
    userId: r.user_id,
    dernierScore: r.dernier_score,
    dernierTotal: r.dernier_total,
    meilleurPct: r.meilleur_pct,
    parties: r.parties,
    updatedAt: r.updated_at,
  };
}

// --- Groupes et membres ---------------------------------------------------

export async function listerMesGroupes(userId: string): Promise<MonGroupe[]> {
  const lignes = verifier(
    await getSupabase()
      .from("carnet_groupes_membres")
      .select("role, pseudo, joined_at, groupe:carnet_groupes(*)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
  ) as any[];
  return (lignes ?? [])
    .filter((l) => l.groupe)
    .map((l) => ({ ...versGroupe(l.groupe), monRole: l.role, monPseudo: l.pseudo }));
}

export async function creerGroupe(nom: string, pseudo: string): Promise<string> {
  return verifier(
    await getSupabase().rpc("carnet_groupe_creer", { p_nom: nom.trim(), p_pseudo: pseudo.trim() })
  ) as string;
}

export async function rejoindreGroupe(code: string, pseudo: string): Promise<string> {
  return verifier(
    await getSupabase().rpc("carnet_groupe_rejoindre", {
      p_code: normaliserCode(code),
      p_pseudo: pseudo.trim(),
    })
  ) as string;
}

export async function quitterGroupe(groupeId: string): Promise<void> {
  verifier(await getSupabase().rpc("carnet_groupe_quitter", { p_groupe: groupeId }));
}

export async function chargerGroupe(groupeId: string): Promise<{ groupe: Groupe; membres: Membre[] }> {
  const sb = getSupabase();
  const [g, m] = await Promise.all([
    sb.from("carnet_groupes").select("*").eq("id", groupeId).maybeSingle(),
    sb.from("carnet_groupes_membres").select("user_id, pseudo, role, joined_at").eq("groupe_id", groupeId),
  ]);
  const ligne = verifier(g);
  // RLS : un groupe dont on n'est pas (ou plus) membre renvoie simplement
  // « rien », pas une erreur de permission.
  if (!ligne) throw new Error("Ce groupe n'existe pas, ou tu n'en fais plus partie.");
  const membres = (verifier(m) as any[]).map((r) => ({
    userId: r.user_id,
    pseudo: r.pseudo,
    role: r.role,
    joinedAt: r.joined_at,
  }));
  return { groupe: versGroupe(ligne), membres };
}

// --- Messages -------------------------------------------------------------

/** Nombre de messages chargés à l'ouverture : le fil récent, pas l'année entière. */
export const MESSAGES_PAR_PAGE = 100;

export async function chargerMessages(groupeId: string): Promise<MessageGroupe[]> {
  const lignes = verifier(
    await getSupabase()
      .from("carnet_groupes_messages")
      .select("*")
      .eq("groupe_id", groupeId)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PAR_PAGE)
  ) as any[];
  // Récupérés du plus récent au plus ancien (pour que la limite garde les
  // derniers), affichés dans l'ordre de lecture.
  return lignes.map(versMessage).reverse();
}

export async function envoyerMessageTexte(groupeId: string, userId: string, texte: string): Promise<MessageGroupe> {
  const ligne = verifier(
    await getSupabase()
      .from("carnet_groupes_messages")
      .insert({ groupe_id: groupeId, auteur_id: userId, type: "texte", texte: texte.trim() })
      .select("*")
      .single()
  );
  return versMessage(ligne);
}

export async function envoyerMessageDevoir(
  groupeId: string,
  userId: string,
  devoir: DevoirPartage
): Promise<MessageGroupe> {
  const ligne = verifier(
    await getSupabase()
      .from("carnet_groupes_messages")
      .insert({ groupe_id: groupeId, auteur_id: userId, type: "devoir", devoir })
      .select("*")
      .single()
  );
  return versMessage(ligne);
}

export async function supprimerMessage(id: string): Promise<void> {
  verifier(await getSupabase().from("carnet_groupes_messages").delete().eq("id", id));
}

// --- Événements -----------------------------------------------------------

export async function chargerEvenements(groupeId: string): Promise<EvenementGroupe[]> {
  const lignes = verifier(
    await getSupabase()
      .from("carnet_groupes_evenements")
      .select("*")
      .eq("groupe_id", groupeId)
      .order("debut", { ascending: true })
  ) as any[];
  return lignes.map(versEvenement);
}

export async function creerEvenement(
  groupeId: string,
  userId: string,
  input: { titre: string; description: string; debut: Date }
): Promise<EvenementGroupe> {
  const ligne = verifier(
    await getSupabase()
      .from("carnet_groupes_evenements")
      .insert({
        groupe_id: groupeId,
        auteur_id: userId,
        titre: input.titre.trim(),
        description: input.description.trim(),
        debut: input.debut.toISOString(),
      })
      .select("*")
      .single()
  );
  return versEvenement(ligne);
}

export async function supprimerEvenement(id: string): Promise<void> {
  verifier(await getSupabase().from("carnet_groupes_evenements").delete().eq("id", id));
}

// --- Devoirs collectifs ---------------------------------------------------

export async function chargerDevoirs(groupeId: string): Promise<DevoirGroupe[]> {
  const lignes = verifier(
    await getSupabase()
      .from("carnet_groupes_devoirs")
      .select("*, carnet_groupes_devoirs_faits(user_id, fait)")
      .eq("groupe_id", groupeId)
      .order("echeance", { ascending: true })
  ) as any[];
  return lignes.map(versDevoir);
}

export async function creerDevoir(
  groupeId: string,
  userId: string,
  input: { matiere: string; echeance: string; description: string }
): Promise<DevoirGroupe> {
  const ligne = verifier(
    await getSupabase()
      .from("carnet_groupes_devoirs")
      .insert({
        groupe_id: groupeId,
        auteur_id: userId,
        matiere: input.matiere.trim(),
        echeance: input.echeance,
        description: input.description.trim(),
      })
      .select("*")
      .single()
  );
  return versDevoir(ligne);
}

export async function supprimerDevoir(id: string): Promise<void> {
  verifier(await getSupabase().from("carnet_groupes_devoirs").delete().eq("id", id));
}

export async function marquerDevoirFait(
  devoirId: string,
  groupeId: string,
  userId: string,
  fait: boolean
): Promise<void> {
  verifier(
    await getSupabase()
      .from("carnet_groupes_devoirs_faits")
      .upsert(
        { devoir_id: devoirId, groupe_id: groupeId, user_id: userId, fait, updated_at: new Date().toISOString() },
        { onConflict: "devoir_id,user_id" }
      )
  );
}

// --- Contrôles, fiches partagées, scores ----------------------------------

export async function chargerControles(groupeId: string): Promise<ControleGroupe[]> {
  const lignes = verifier(
    await getSupabase()
      .from("carnet_groupes_controles")
      .select("*")
      .eq("groupe_id", groupeId)
      .order("date", { ascending: true })
  ) as any[];
  return lignes.map(versControle);
}

export async function creerControle(
  groupeId: string,
  userId: string,
  input: { matiere: string; date: string; chapitre: string }
): Promise<ControleGroupe> {
  const ligne = verifier(
    await getSupabase()
      .from("carnet_groupes_controles")
      .insert({
        groupe_id: groupeId,
        auteur_id: userId,
        matiere: input.matiere.trim(),
        date: input.date,
        chapitre: input.chapitre.trim(),
      })
      .select("*")
      .single()
  );
  return versControle(ligne);
}

export async function supprimerControle(id: string): Promise<void> {
  verifier(await getSupabase().from("carnet_groupes_controles").delete().eq("id", id));
}

export async function chargerFichesPartagees(controleId: string): Promise<FichePartagee[]> {
  const lignes = verifier(
    await getSupabase()
      .from("carnet_groupes_fiches")
      .select("*")
      .eq("controle_id", controleId)
      .order("created_at", { ascending: true })
  ) as any[];
  return lignes.map(versFiche);
}

/** Toutes les fiches partagées dans le groupe, tous contrôles confondus (bibliothèque de la classe). */
export async function chargerFichesGroupe(groupeId: string): Promise<FichePartagee[]> {
  const lignes = verifier(
    await getSupabase()
      .from("carnet_groupes_fiches")
      .select("*")
      .eq("groupe_id", groupeId)
      .order("created_at", { ascending: false })
      .limit(200)
  ) as any[];
  return lignes.map(versFiche);
}

export async function partagerFiche(
  controle: ControleGroupe,
  userId: string,
  fiche: { titre: string; matiere: string; genere: FicheGeneree; ia?: import("./ficheGemini").FicheIA }
): Promise<FichePartagee> {
  const ligne = verifier(
    await getSupabase()
      .from("carnet_groupes_fiches")
      .insert({
        controle_id: controle.id,
        groupe_id: controle.groupeId,
        auteur_id: userId,
        titre: fiche.titre.trim().slice(0, 120) || "Sans titre",
        matiere: fiche.matiere.slice(0, 60),
        // La version Gemini voyage DANS la colonne genere (jsonb) plutôt que
        // dans une nouvelle colonne : pas de migration SQL à relancer.
        genere: fiche.ia ? { ...fiche.genere, ia: fiche.ia } : fiche.genere,
      })
      .select("*")
      .single()
  );
  return versFiche(ligne);
}

export async function retirerFichePartagee(id: string): Promise<void> {
  verifier(await getSupabase().from("carnet_groupes_fiches").delete().eq("id", id));
}

export async function chargerScores(controleId: string): Promise<ScoreGroupe[]> {
  const lignes = verifier(
    await getSupabase().from("carnet_groupes_scores").select("*").eq("controle_id", controleId)
  ) as any[];
  return lignes.map(versScore);
}

export async function enregistrerScore(controleId: string, score: number, total: number): Promise<void> {
  verifier(
    await getSupabase().rpc("carnet_groupe_score", {
      p_controle: controleId,
      p_score: score,
      p_total: total,
    })
  );
}

// --- Temps réel -----------------------------------------------------------

export type AbonnementHandlers = {
  onMessage: (m: MessageGroupe) => void;
  onFait: (devoirId: string, etat: EtatFait) => void;
  onScore: (s: ScoreGroupe) => void;
};

/**
 * Ouvre UN canal par groupe, qui écoute les trois tables publiées. Renvoie la
 * fonction de désabonnement : l'écran du groupe l'appelle en se démontant,
 * sinon chaque ouverture ajouterait un canal de plus et on recevrait chaque
 * message en double, triple…
 *
 * Seules les insertions de messages sont écoutées : une suppression n'est pas
 * filtrable par groupe côté Realtime, elle apparaîtra au prochain chargement.
 */
export function abonnerGroupe(groupeId: string, h: AbonnementHandlers): () => void {
  const sb = getSupabase();
  const filtre = `groupe_id=eq.${groupeId}`;
  const canal: RealtimeChannel = sb
    .channel(`groupe-${groupeId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "carnet_groupes_messages", filter: filtre },
      (payload: any) => h.onMessage(versMessage(payload.new))
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "carnet_groupes_devoirs_faits", filter: filtre },
      (payload: any) => {
        const r = payload.new;
        if (r?.devoir_id) h.onFait(r.devoir_id, { userId: r.user_id, fait: !!r.fait });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "carnet_groupes_scores", filter: filtre },
      (payload: any) => {
        if (payload.new?.controle_id) h.onScore(versScore(payload.new));
      }
    )
    .subscribe();

  return () => {
    void sb.removeChannel(canal);
  };
}

// --- Petits utilitaires de date -------------------------------------------

/** "AAAA-MM-JJ" d'une date locale. */
export function jourISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Nombre de jours entre aujourd'hui et un jour "AAAA-MM-JJ" (négatif = passé). */
export function joursAvantISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const cible = new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  return Math.round((cible - auj.getTime()) / (24 * 60 * 60 * 1000));
}
