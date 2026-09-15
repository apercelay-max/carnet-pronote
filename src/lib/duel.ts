// Duel en direct sur le quiz d'un contrôle de groupe.
//
// Pas de table ni de script SQL : tout passe par un canal Supabase Realtime
// éphémère (« broadcast » pour les messages, « presence » pour savoir qui a
// l'écran du contrôle ouvert). Rien n'est stocké : si quelqu'un ferme l'app,
// le duel s'arrête, et seul le score final passe par la table des scores
// habituelle.
//
// Limite assumée : un canal broadcast n'est pas protégé par la RLS. Son nom
// contient l'id du contrôle (un UUID impossible à deviner), ce qui suffit
// pour un quiz de révision — on n'y fait transiter aucune donnée personnelle
// hormis le pseudo.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabaseAuth";
import type { Carte } from "./fiches";

export type QuestionDuel = { carte: Carte; options: string[] | null };
export type JoueurDuel = { userId: string; pseudo: string };

export type Invitation = { deId: string; dePseudo: string; versId: string; questions: QuestionDuel[] };
export type ReponseInvitation = { deId: string; versId: string; accepte: boolean };
export type ProgresDuel = { userId: string; index: number; bonnes: number };
export type FinDuel = { userId: string; bonnes: number; total: number };

export type HandlersDuel = {
  onPresence: (joueurs: JoueurDuel[]) => void;
  onInvite: (p: Invitation) => void;
  onReponse: (p: ReponseInvitation) => void;
  onProgres: (p: ProgresDuel) => void;
  onFin: (p: FinDuel) => void;
};

export type CanalDuel = {
  inviter: (p: Invitation) => void;
  repondre: (p: ReponseInvitation) => void;
  progres: (p: ProgresDuel) => void;
  fin: (p: FinDuel) => void;
  fermer: () => void;
};

export function ouvrirDuel(controleId: string, moi: JoueurDuel, h: HandlersDuel): CanalDuel {
  const sb = getSupabase();
  const canal: RealtimeChannel = sb.channel(`duel-${controleId}`, {
    config: { broadcast: { self: false }, presence: { key: moi.userId } },
  });

  canal
    .on("broadcast", { event: "invite" }, ({ payload }) => h.onInvite(payload as Invitation))
    .on("broadcast", { event: "reponse" }, ({ payload }) => h.onReponse(payload as ReponseInvitation))
    .on("broadcast", { event: "progres" }, ({ payload }) => h.onProgres(payload as ProgresDuel))
    .on("broadcast", { event: "fin" }, ({ payload }) => h.onFin(payload as FinDuel))
    .on("presence", { event: "sync" }, () => {
      const etat = canal.presenceState() as Record<string, any[]>;
      const joueurs = Object.values(etat)
        .map((l) => l?.[0])
        .filter((j): j is JoueurDuel => !!j?.userId && j.userId !== moi.userId);
      h.onPresence(joueurs);
    })
    .subscribe(async (statut) => {
      if (statut === "SUBSCRIBED") await canal.track({ userId: moi.userId, pseudo: moi.pseudo });
    });

  const envoyer = (event: string, payload: unknown) => {
    void canal.send({ type: "broadcast", event, payload });
  };

  return {
    inviter: (p) => envoyer("invite", p),
    repondre: (p) => envoyer("reponse", p),
    progres: (p) => envoyer("progres", p),
    fin: (p) => envoyer("fin", p),
    fermer: () => {
      void sb.removeChannel(canal);
    },
  };
}
