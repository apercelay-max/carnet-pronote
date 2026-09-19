import { Alert, Platform } from "react-native";

/**
 * Demande de confirmation qui marche AUSSI sur le web : `Alert.alert` avec
 * des boutons ne fait rien dans react-native-web, la suppression serait donc
 * impossible depuis Safari. On passe par `window.confirm` là-bas.
 */
export function confirmer(titre: string, message: string, libelle: string, action: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${titre}\n\n${message}`)) action();
    return;
  }
  Alert.alert(titre, message, [
    { text: "Annuler", style: "cancel" },
    { text: libelle, style: "destructive", onPress: action },
  ]);
}
