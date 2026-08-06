// Stockage du token de rafraîchissement Pronote (jamais le mot de passe).
//
// Sur mobile (iOS/Android) : Keychain/Keystore via expo-secure-store, ce qui
// est chiffré et propre au système.
// Sur web : expo-secure-store n'a AUCUNE implémentation (son module .web.js
// est un objet vide) — l'appeler plante l'app. On utilise donc localStorage,
// nécessaire pour que la connexion Pronote réelle fonctionne aussi sur le
// web. C'est moins sécurisé qu'un vrai coffre-fort natif (le token reste
// accessible si quelqu'un a accès au navigateur), mais c'est la seule option
// disponible côté web et l'usage reste personnel.

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
