import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Document HTML racine du build web (utilisé UNIQUEMENT par `expo export -p
// web`, jamais par l'app native). Sans ce fichier, "Ajouter à l'écran
// d'accueil" donne un simple raccourci vers un onglet de navigateur. Avec
// le manifest + les métadonnées ci-dessous, ça installe une vraie icône et
// ça s'ouvre en plein écran, sans barre d'adresse.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="description" content="Tes notes, ton emploi du temps et tes devoirs — sans passer par Pronote." />

        <meta name="theme-color" content="#0B0D12" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Carnet" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
