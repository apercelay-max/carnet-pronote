// Photos → texte avec Gemini (cours, page de manuel, tableau).
//
// Le cahier de textes Pronote est souvent vide ou télégraphique : le vrai
// cours est dans le cahier de l'élève. On le prend en photo, Gemini le
// transcrit, et le texte repart dans le circuit normal des fiches.
//
// Web uniquement pour l'instant : l'app est utilisée en PWA, et le sélecteur
// de fichiers du navigateur propose déjà l'appareil photo sur iPhone. Sur
// natif il faudrait expo-image-picker, pas installé.

import { Platform } from "react-native";
import { askGemini } from "./gemini";

export type Photo = { mimeType: string; data: string };

/** Au-delà, la requête dépasse la limite de taille du relais Vercel (~4,5 Mo). */
export const MAX_PHOTOS = 4;
const COTE_MAX = 1600;

export function photosDisponibles(): boolean {
  return Platform.OS === "web" && typeof document !== "undefined";
}

/**
 * Réduit une image à 1600 px de côté en JPEG : une photo d'iPhone brute pèse
 * 3-5 Mo, bien trop pour le relais ; à cette taille le texte reste lisible.
 */
function reduire(fichier: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const echelle = Math.min(1, COTE_MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * echelle);
      canvas.height = Math.round(img.height * echelle);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Impossible de lire cette image."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      resolve({ mimeType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Format d'image non reconnu (essaie une capture JPEG ou PNG)."));
    };
    img.src = url;
  });
}

/** Ouvre le sélecteur (appareil photo ou photothèque). Tableau vide si annulé. */
export function choisirPhotos(): Promise<Photo[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";
    input.onchange = async () => {
      const fichiers = Array.from(input.files ?? []).slice(0, MAX_PHOTOS);
      input.remove();
      try {
        resolve(await Promise.all(fichiers.map(reduire)));
      } catch (e) {
        reject(e);
      }
    };
    document.body.appendChild(input);
    input.click();
  });
}

export async function transcrireCours(photos: Photo[], apiKey: string | null): Promise<string> {
  const texte = await askGemini(
    `Transcris fidèlement en texte le contenu scolaire visible sur ${photos.length > 1 ? "ces photos (dans l'ordre)" : "cette photo"} : cahier, page de manuel ou tableau.
- Garde la structure : titres, sous-titres, définitions, listes, exemples.
- Écris les formules en texte lisible (ex. f(x) = 2x + 3, a² + b² = c²).
- Ignore ce qui n'est pas du cours (gribouillis, marges, numéros de page).
- N'invente rien et ne complète pas : si un passage est illisible, écris [illisible].
Réponds uniquement avec la transcription, sans commentaire.`,
    { apiKey, images: photos, generation: { temperature: 0.1, maxOutputTokens: 8192 } }
  );
  return texte.trim();
}
