// Client Supabase utilisé pour le compte Carnet (email + mot de passe).
//
// Pourquoi un client à part de celui de lib/sync.ts : celui-là sert la
// synchronisation par code court et tourne volontairement SANS session
// (`persistSession: false`). Un compte, lui, a besoin exactement de l'inverse
// — session gardée sur l'appareil et jeton rafraîchi tout seul. Deux usages,
// deux configurations ; les deux parlent au même projet Supabase.
//
// Le client est créé à la PREMIÈRE utILISATION, jamais au chargement du
// module : `expo export -p web` pré-rend les pages dans Node, où `window`
// n'existe pas. Un client construit à l'import s'exécuterait pendant ce
// pré-rendu.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://elyspjsyconovzczmzhm.supabase.co";
const SUPABASE_KEY = "sb_publishable_jpQmyTu3lkT65xw0Z6oXmg_7zxkqRXW";

/** Une ligne par compte : l'instantané complet des réglages et des fiches. */
export const COMPTES_TABLE = "carnet_comptes";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    // require() plutôt qu'un import statique, pour la même raison : le module
    // supabase-js ne doit pas être évalué pendant le pré-rendu Node.
    const { createClient } = require("@supabase/supabase-js");
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // Pas de lecture de l'URL : l'app n'utilise pas de lien magique ni
        // d'OAuth, et cette option touche `window.location` (absent sur mobile).
        detectSessionInUrl: false,
      },
    });
  }
  return client!;
}

/**
 * Traduit les erreurs Supabase, qui arrivent en anglais, en messages
 * utilisables par un élève de collège.
 */
export function messageErreur(brut: string): string {
  const m = brut.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Un compte existe déjà avec cet email. Connecte-toi plutôt.";
  if (m.includes("password should be at least"))
    return "Le mot de passe doit faire au moins 6 caractères.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Cette adresse email n'a pas l'air valide.";
  if (m.includes("email not confirmed"))
    return "Il faut d'abord confirmer ton email : regarde le message que Supabase t'a envoyé.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Trop de tentatives d'un coup — attends une minute.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Pas de connexion au serveur. Vérifie ta connexion internet.";
  return brut;
}
