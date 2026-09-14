import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAccountStore } from "./useAccountStore";
import type { FicheGeneree } from "../lib/fiches";
import {
  abonnerGroupe,
  chargerControles,
  chargerDevoirs,
  chargerEvenements,
  chargerFichesPartagees,
  chargerGroupe,
  chargerMessages,
  chargerScores,
  creerControle,
  creerDevoir,
  creerEvenement,
  creerGroupe,
  enregistrerScore,
  envoyerMessageDevoir,
  envoyerMessageTexte,
  listerMesGroupes,
  marquerDevoirFait,
  messageErreurGroupe,
  partagerFiche,
  quitterGroupe,
  rejoindreGroupe,
  retirerFichePartagee,
  supprimerControle,
  supprimerDevoir,
  supprimerEvenement,
  supprimerMessage,
  type ControleGroupe,
  type DevoirGroupe,
  type DevoirPartage,
  type EvenementGroupe,
  type FichePartagee,
  type Groupe,
  type Membre,
  type MessageGroupe,
  type MonGroupe,
  type ScoreGroupe,
} from "../lib/groupes";

// Groupes de classe. Contrairement aux fiches ou aux éléments perso, presque
// rien n'est gardé sur l'appareil : la vérité est sur Supabase, partagée par
// toute la classe. Seul le pseudo est persisté, pour ne pas le retaper à
// chaque groupe rejoint.
//
// Un seul groupe « actif » à la fois (celui dont l'écran est ouvert) : c'est
// lui qui a un canal Realtime ouvert. Garder un canal par groupe rejoint
// consommerait du réseau et de la batterie pour des fils que personne ne lit.

export type GroupeActif = {
  groupeId: string;
  groupe: Groupe | null;
  membres: Membre[];
  messages: MessageGroupe[];
  evenements: EvenementGroupe[];
  devoirs: DevoirGroupe[];
  controles: ControleGroupe[];
  chargement: boolean;
  erreur: string | null;
};

type GroupesState = {
  pseudo: string;
  groupes: MonGroupe[];
  listeChargee: boolean;
  chargementListe: boolean;
  /** Occupé pendant créer / rejoindre / quitter. */
  busy: boolean;
  erreur: string | null;

  actif: GroupeActif | null;
  fichesParControle: Record<string, FichePartagee[]>;
  scoresParControle: Record<string, ScoreGroupe[]>;

  setPseudo: (p: string) => void;
  effacerErreur: () => void;
  chargerListe: () => Promise<void>;
  creer: (nom: string) => Promise<string | null>;
  rejoindre: (code: string) => Promise<string | null>;
  quitter: (groupeId: string) => Promise<boolean>;

  ouvrir: (groupeId: string) => Promise<void>;
  fermer: () => void;
  rafraichir: () => Promise<void>;

  envoyerTexte: (texte: string) => Promise<boolean>;
  partagerDevoir: (d: DevoirPartage) => Promise<boolean>;
  supprimerMessage: (id: string) => Promise<void>;

  ajouterEvenement: (input: { titre: string; description: string; debut: Date }) => Promise<boolean>;
  retirerEvenement: (id: string) => Promise<void>;

  ajouterDevoir: (input: { matiere: string; echeance: string; description: string }) => Promise<boolean>;
  retirerDevoir: (id: string) => Promise<void>;
  basculerFait: (devoirId: string) => Promise<void>;

  ajouterControle: (input: { matiere: string; date: string; chapitre: string }) => Promise<boolean>;
  retirerControle: (id: string) => Promise<void>;
  chargerControle: (controleId: string) => Promise<void>;
  partagerFiche: (
    controleId: string,
    fiche: { titre: string; matiere: string; genere: FicheGeneree; ia?: import("../lib/ficheGemini").FicheIA }
  ) => Promise<boolean>;
  retirerFiche: (controleId: string, ficheId: string) => Promise<void>;
  enregistrerScore: (controleId: string, score: number, total: number) => Promise<void>;
};

/** Canal Realtime du groupe actif — hors du state : ce n'est pas affichable. */
let desabonner: (() => void) | null = null;

function uid(): string | null {
  return useAccountStore.getState().userId;
}

/** Ajoute ou remplace par id, en gardant l'ordre existant. */
function fusionner<T extends { id: string }>(liste: T[], el: T): T[] {
  const i = liste.findIndex((x) => x.id === el.id);
  if (i === -1) return [...liste, el];
  const copie = liste.slice();
  copie[i] = el;
  return copie;
}

export const useGroupesStore = create<GroupesState>()(
  persist(
    (set, get) => {
      /** Met à jour le groupe actif seulement s'il s'agit toujours du même. */
      function majActif(groupeId: string, patch: (a: GroupeActif) => Partial<GroupeActif>) {
        const a = get().actif;
        if (!a || a.groupeId !== groupeId) return;
        set({ actif: { ...a, ...patch(a) } });
      }

      function echec(err: unknown) {
        const message = messageErreurGroupe(err);
        const a = get().actif;
        set(a ? { erreur: message, actif: { ...a, erreur: message } } : { erreur: message });
      }

      return {
        pseudo: "",
        groupes: [],
        listeChargee: false,
        chargementListe: false,
        busy: false,
        erreur: null,
        actif: null,
        fichesParControle: {},
        scoresParControle: {},

        setPseudo: (p) => set({ pseudo: p.slice(0, 30) }),
        effacerErreur: () => {
          const a = get().actif;
          set(a ? { erreur: null, actif: { ...a, erreur: null } } : { erreur: null });
        },

        chargerListe: async () => {
          const userId = uid();
          if (!userId) return;
          set({ chargementListe: true, erreur: null });
          try {
            const groupes = await listerMesGroupes(userId);
            set({ groupes, listeChargee: true, chargementListe: false });
          } catch (err) {
            set({ chargementListe: false, listeChargee: true, erreur: messageErreurGroupe(err) });
          }
        },

        creer: async (nom) => {
          set({ busy: true, erreur: null });
          try {
            const id = await creerGroupe(nom, get().pseudo);
            set({ busy: false });
            await get().chargerListe();
            return id;
          } catch (err) {
            set({ busy: false, erreur: messageErreurGroupe(err) });
            return null;
          }
        },

        rejoindre: async (code) => {
          set({ busy: true, erreur: null });
          try {
            const id = await rejoindreGroupe(code, get().pseudo);
            set({ busy: false });
            await get().chargerListe();
            return id;
          } catch (err) {
            set({ busy: false, erreur: messageErreurGroupe(err) });
            return null;
          }
        },

        quitter: async (groupeId) => {
          set({ busy: true, erreur: null });
          try {
            await quitterGroupe(groupeId);
            if (get().actif?.groupeId === groupeId) get().fermer();
            set((s) => ({ busy: false, groupes: s.groupes.filter((g) => g.id !== groupeId) }));
            return true;
          } catch (err) {
            set({ busy: false, erreur: messageErreurGroupe(err) });
            return false;
          }
        },

        ouvrir: async (groupeId) => {
          const deja = get().actif;
          if (!deja || deja.groupeId !== groupeId) {
            desabonner?.();
            desabonner = null;
            set({
              actif: {
                groupeId,
                groupe: get().groupes.find((g) => g.id === groupeId) ?? null,
                membres: [],
                messages: [],
                evenements: [],
                devoirs: [],
                controles: [],
                chargement: true,
                erreur: null,
              },
              fichesParControle: {},
              scoresParControle: {},
            });
          }

          // Abonnement AVANT le chargement : un message envoyé pendant la
          // requête arrive par le canal au lieu d'être perdu entre les deux.
          // Les doublons éventuels sont absorbés par `fusionner` (par id).
          if (!desabonner) {
            desabonner = abonnerGroupe(groupeId, {
              onMessage: (m) => majActif(groupeId, (a) => ({ messages: fusionner(a.messages, m) })),
              onFait: (devoirId, etat) =>
                majActif(groupeId, (a) => ({
                  devoirs: a.devoirs.map((d) =>
                    d.id === devoirId
                      ? { ...d, faits: [...d.faits.filter((f) => f.userId !== etat.userId), etat] }
                      : d
                  ),
                })),
              onScore: (score) =>
                set((s) => {
                  const liste = s.scoresParControle[score.controleId];
                  // Contrôle jamais ouvert sur cet appareil : rien à mettre à
                  // jour, son classement sera chargé à l'ouverture.
                  if (!liste) return {};
                  return {
                    scoresParControle: {
                      ...s.scoresParControle,
                      [score.controleId]: [...liste.filter((x) => x.userId !== score.userId), score],
                    },
                  };
                }),
            });
          }

          await get().rafraichir();
        },

        fermer: () => {
          desabonner?.();
          desabonner = null;
          set({ actif: null, fichesParControle: {}, scoresParControle: {} });
        },

        rafraichir: async () => {
          const a = get().actif;
          if (!a) return;
          const groupeId = a.groupeId;
          majActif(groupeId, () => ({ chargement: true, erreur: null }));
          try {
            const [base, messages, evenements, devoirs, controles] = await Promise.all([
              chargerGroupe(groupeId),
              chargerMessages(groupeId),
              chargerEvenements(groupeId),
              chargerDevoirs(groupeId),
              chargerControles(groupeId),
            ]);
            majActif(groupeId, (cur) => ({
              groupe: base.groupe,
              membres: base.membres,
              // Garde les messages arrivés en direct pendant le chargement.
              messages: cur.messages.reduce(fusionner, messages),
              evenements,
              devoirs,
              controles,
              chargement: false,
            }));
          } catch (err) {
            majActif(groupeId, () => ({ chargement: false, erreur: messageErreurGroupe(err) }));
          }
        },

        envoyerTexte: async (texte) => {
          const a = get().actif;
          const userId = uid();
          if (!a || !userId || !texte.trim()) return false;
          try {
            const m = await envoyerMessageTexte(a.groupeId, userId, texte);
            majActif(a.groupeId, (cur) => ({ messages: fusionner(cur.messages, m) }));
            return true;
          } catch (err) {
            echec(err);
            return false;
          }
        },

        partagerDevoir: async (d) => {
          const a = get().actif;
          const userId = uid();
          if (!a || !userId) return false;
          try {
            const m = await envoyerMessageDevoir(a.groupeId, userId, d);
            majActif(a.groupeId, (cur) => ({ messages: fusionner(cur.messages, m) }));
            return true;
          } catch (err) {
            echec(err);
            return false;
          }
        },

        supprimerMessage: async (id) => {
          const a = get().actif;
          if (!a) return;
          try {
            await supprimerMessage(id);
            majActif(a.groupeId, (cur) => ({ messages: cur.messages.filter((m) => m.id !== id) }));
          } catch (err) {
            echec(err);
          }
        },

        ajouterEvenement: async (input) => {
          const a = get().actif;
          const userId = uid();
          if (!a || !userId) return false;
          try {
            const e = await creerEvenement(a.groupeId, userId, input);
            majActif(a.groupeId, (cur) => ({
              evenements: fusionner(cur.evenements, e).sort((x, y) => x.debut.localeCompare(y.debut)),
            }));
            return true;
          } catch (err) {
            echec(err);
            return false;
          }
        },

        retirerEvenement: async (id) => {
          const a = get().actif;
          if (!a) return;
          try {
            await supprimerEvenement(id);
            majActif(a.groupeId, (cur) => ({ evenements: cur.evenements.filter((e) => e.id !== id) }));
          } catch (err) {
            echec(err);
          }
        },

        ajouterDevoir: async (input) => {
          const a = get().actif;
          const userId = uid();
          if (!a || !userId) return false;
          try {
            const d = await creerDevoir(a.groupeId, userId, input);
            majActif(a.groupeId, (cur) => ({
              devoirs: fusionner(cur.devoirs, d).sort((x, y) => x.echeance.localeCompare(y.echeance)),
            }));
            return true;
          } catch (err) {
            echec(err);
            return false;
          }
        },

        retirerDevoir: async (id) => {
          const a = get().actif;
          if (!a) return;
          try {
            await supprimerDevoir(id);
            majActif(a.groupeId, (cur) => ({ devoirs: cur.devoirs.filter((d) => d.id !== id) }));
          } catch (err) {
            echec(err);
          }
        },

        basculerFait: async (devoirId) => {
          const a = get().actif;
          const userId = uid();
          if (!a || !userId) return;
          const devoir = a.devoirs.find((d) => d.id === devoirId);
          if (!devoir) return;
          const avant = devoir.faits;
          const fait = !avant.some((f) => f.userId === userId && f.fait);

          // Mise à jour optimiste : cocher doit réagir tout de suite, même
          // avec un réseau de cantine. On revient en arrière si ça échoue.
          const appliquer = (faits: typeof avant) =>
            majActif(a.groupeId, (cur) => ({
              devoirs: cur.devoirs.map((d) => (d.id === devoirId ? { ...d, faits } : d)),
            }));
          appliquer([...avant.filter((f) => f.userId !== userId), { userId, fait }]);
          try {
            await marquerDevoirFait(devoirId, a.groupeId, userId, fait);
          } catch (err) {
            appliquer(avant);
            echec(err);
          }
        },

        ajouterControle: async (input) => {
          const a = get().actif;
          const userId = uid();
          if (!a || !userId) return false;
          try {
            const c = await creerControle(a.groupeId, userId, input);
            majActif(a.groupeId, (cur) => ({
              controles: fusionner(cur.controles, c).sort((x, y) => x.date.localeCompare(y.date)),
            }));
            return true;
          } catch (err) {
            echec(err);
            return false;
          }
        },

        retirerControle: async (id) => {
          const a = get().actif;
          if (!a) return;
          try {
            await supprimerControle(id);
            majActif(a.groupeId, (cur) => ({ controles: cur.controles.filter((c) => c.id !== id) }));
          } catch (err) {
            echec(err);
          }
        },

        chargerControle: async (controleId) => {
          try {
            const [fiches, scores] = await Promise.all([
              chargerFichesPartagees(controleId),
              chargerScores(controleId),
            ]);
            set((s) => ({
              fichesParControle: { ...s.fichesParControle, [controleId]: fiches },
              scoresParControle: { ...s.scoresParControle, [controleId]: scores },
            }));
          } catch (err) {
            echec(err);
          }
        },

        partagerFiche: async (controleId, fiche) => {
          const userId = uid();
          const controle = get().actif?.controles.find((c) => c.id === controleId);
          if (!userId || !controle) return false;
          try {
            const partagee = await partagerFiche(controle, userId, fiche);
            set((s) => ({
              fichesParControle: {
                ...s.fichesParControle,
                [controleId]: fusionner(s.fichesParControle[controleId] ?? [], partagee),
              },
            }));
            return true;
          } catch (err) {
            echec(err);
            return false;
          }
        },

        retirerFiche: async (controleId, ficheId) => {
          try {
            await retirerFichePartagee(ficheId);
            set((s) => ({
              fichesParControle: {
                ...s.fichesParControle,
                [controleId]: (s.fichesParControle[controleId] ?? []).filter((f) => f.id !== ficheId),
              },
            }));
          } catch (err) {
            echec(err);
          }
        },

        enregistrerScore: async (controleId, score, total) => {
          if (total <= 0) return;
          try {
            await enregistrerScore(controleId, score, total);
            // Relecture plutôt que calcul local : « meilleur » et « parties »
            // sont calculés par le serveur, autant afficher SA version.
            const scores = await chargerScores(controleId);
            set((s) => ({ scoresParControle: { ...s.scoresParControle, [controleId]: scores } }));
          } catch (err) {
            echec(err);
          }
        },
      };
    },
    {
      name: "carnet-groupes",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Seul le pseudo survit à un redémarrage : les groupes et leurs messages
      // se rechargent depuis Supabase, les garder en cache montrerait un fil
      // périmé au lieu du vrai.
      partialize: (s) => ({ pseudo: s.pseudo }),
    }
  )
);
