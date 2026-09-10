// Synchronisation entre appareils des éléments perso (pense-bête, devoirs et
// créneaux ajoutés à la main) — voir useLocalItemsStore.
//
// Pas de vrai compte : un code court est généré sur le premier appareil et
// recopié sur les autres. Une ligne Supabase par code contient un instantané
// JSON complet des éléments perso. Dernier écrit gagnant — largement suffisant
// pour un élève sur 2-3 appareils, ce n'est pas un outil collaboratif.
//
// Même modèle que cap-sur-la-5e (l'autre app de Léo). Rien de sensible ici :
// l'URL et la clé « publishable » sont déjà publiques dans ce repo-là, et la
// table est protégée par RLS côté Supabase. On les met donc en dur plutôt que
// d'imposer une variable d'environnement Vercel de plus.
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://elyspjsyconovzczmzhm.supabase.co";
const SUPABASE_KEY = "sb_publishable_jpQmyTu3lkT65xw0Z6oXmg_7zxkqRXW";

export const TABLE = "carnet_pronote_state";

// persistSession/autoRefreshToken désactivés : on n'utilise pas l'auth
// Supabase, seulement une table publique. Ça évite un adaptateur de stockage
// et les avertissements associés en environnement React Native.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function genSyncCode(): string {
  // Sans 0/O/1/I/L : trop faciles à confondre en recopiant le code à la main.
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
