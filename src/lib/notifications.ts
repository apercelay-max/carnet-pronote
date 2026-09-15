// Notifications web (PWA), avec leurs vraies limites.
//
// L'app est une PWA : sans serveur de push, elle ne peut PAS réveiller le
// téléphone à 18h toute seule. Ce qu'elle peut faire honnêtement : quand on
// l'ouvre (ou qu'on y revient) en fin de journée, afficher UNE notification
// récapitulative par jour. Sur iPhone, ça exige en plus que l'app soit ajoutée
// à l'écran d'accueil (iOS 16.4+) — sinon Safari n'expose pas l'API.

import { Platform } from "react-native";

export function notificationsDisponibles(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window;
}

export function permissionNotifications(): "granted" | "denied" | "default" | "indisponible" {
  if (!notificationsDisponibles()) return "indisponible";
  return (window as any).Notification.permission;
}

async function enregistrerServiceWorker(): Promise<any | null> {
  try {
    if (!("serviceWorker" in navigator)) return null;
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function demanderPermissionNotifications(): Promise<boolean> {
  if (!notificationsDisponibles()) return false;
  try {
    const res = await (window as any).Notification.requestPermission();
    if (res === "granted") await enregistrerServiceWorker();
    return res === "granted";
  } catch {
    return false;
  }
}

function lireStockage(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrireStockage(cle: string, valeur: string) {
  try {
    window.localStorage.setItem(cle, valeur);
  } catch {
    /* navigation privée : tant pis, au pire une notification en double */
  }
}

/**
 * Une seule notification par jour pour une clé donnée. Passe par le service
 * worker quand il existe (obligatoire sur iOS), sinon par `new Notification`.
 */
export async function notifierUneFoisParJour(cle: string, titre: string, corps: string) {
  if (permissionNotifications() !== "granted") return;
  const d = new Date();
  const jour = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const stockage = `carnet-notif-${cle}`;
  if (lireStockage(stockage) === jour) return;
  ecrireStockage(stockage, jour);

  const options = { body: corps, icon: "/icon-192.png", badge: "/icon-192.png", tag: cle };
  try {
    const reg = await enregistrerServiceWorker();
    if (reg?.showNotification) await reg.showNotification(titre, options);
    else new (window as any).Notification(titre, options);
  } catch {
    /* API présente mais refusée par le navigateur : rien à faire de plus */
  }
}
