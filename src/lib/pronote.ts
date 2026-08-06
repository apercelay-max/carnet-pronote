// Fine couche au-dessus de `pawnote` : centralise la connexion et la récupération
// des données Pronote pour que les stores/écrans n'aient jamais à parler à pawnote
// directement. Si Pronote change son protocole, c'est ce fichier qu'on répare.

import { Platform } from "react-native";
import { webProxyFetcher } from "./webFetcher";
import {
  AccountKind,
  createSessionHandle,
  instance as fetchInstance,
  loginCredentials,
  loginToken,
  gradesOverview,
  notebook,
  timetableFromIntervals,
  assignmentsFromIntervals,
  assignmentStatus,
  cleanURL,
  type SessionHandle,
  type RefreshInformation,
  type GradesOverview,
  type Notebook,
  type Timetable,
  type Assignment,
  type Period,
} from "pawnote";

export type StoredCredentials = {
  url: string;
  token: string;
  username: string;
  kind: number;
  deviceUUID: string;
  navigatorIdentifier: string;
};

export class PronoteAuthError extends Error {}
export class PronoteENTError extends Error {}

// Sur mobile : fetch natif de pawnote (pas de CORS).
// Sur web : relai via /api/pronote-proxy (voir src/lib/webFetcher.ts).
function platformFetcher() {
  return Platform.OS === "web" ? webProxyFetcher : undefined;
}

function randomDeviceUUID(): string {
  // pas de crypto.randomUUID fiable partout en RN -> on fabrique un UUID v4 maison
  let uuid = "";
  const hex = "0123456789abcdef";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) uuid += "-";
    else if (i === 14) uuid += "4";
    else uuid += hex[Math.floor(Math.random() * 16)];
  }
  return uuid;
}

export async function checkInstance(url: string) {
  const clean = cleanURL(url);
  const info = await fetchInstance(clean, platformFetcher());
  if (info.casURL) {
    throw new PronoteENTError(
      "Cet établissement demande de passer par un ENT pour se connecter. Ce mode n'est pas encore géré."
    );
  }
  return { cleanUrl: clean, info };
}

export async function loginWithPassword(
  url: string,
  username: string,
  password: string,
  deviceUUID?: string
): Promise<{ session: SessionHandle; refresh: RefreshInformation; credentials: StoredCredentials }> {
  const { cleanUrl } = await checkInstance(url);
  const session = createSessionHandle(platformFetcher());
  const uuid = deviceUUID ?? randomDeviceUUID();

  try {
    const refresh = await loginCredentials(session, {
      url: cleanUrl,
      kind: AccountKind.STUDENT,
      username,
      password,
      deviceUUID: uuid,
    });

    const credentials: StoredCredentials = {
      url: refresh.url,
      token: refresh.token,
      username: refresh.username,
      kind: refresh.kind,
      deviceUUID: uuid,
      navigatorIdentifier: refresh.navigatorIdentifier,
    };

    return { session, refresh, credentials };
  } catch (err: any) {
    throw new PronoteAuthError(
      err?.message ?? "Identifiant ou mot de passe incorrect."
    );
  }
}

export async function restoreSession(
  stored: StoredCredentials
): Promise<{ session: SessionHandle; refresh: RefreshInformation; credentials: StoredCredentials }> {
  const session = createSessionHandle(platformFetcher());

  const refresh = await loginToken(session, {
    url: stored.url,
    kind: stored.kind as any,
    username: stored.username,
    token: stored.token,
    deviceUUID: stored.deviceUUID,
    navigatorIdentifier: stored.navigatorIdentifier,
  });

  const credentials: StoredCredentials = {
    url: refresh.url,
    token: refresh.token,
    username: refresh.username,
    kind: refresh.kind,
    deviceUUID: stored.deviceUUID,
    navigatorIdentifier: refresh.navigatorIdentifier,
  };

  return { session, refresh, credentials };
}

export function currentPeriod(session: SessionHandle): Period | undefined {
  const periods = session.instance.periods;
  const now = new Date();
  return (
    periods.find((p) => now >= p.startDate && now <= p.endDate) ??
    periods[periods.length - 1]
  );
}

export async function fetchGrades(
  session: SessionHandle,
  period?: Period
): Promise<GradesOverview> {
  const target = period ?? currentPeriod(session);
  if (!target) throw new Error("Aucune période disponible.");
  return gradesOverview(session, target);
}

export async function fetchNotebook(
  session: SessionHandle,
  period?: Period
): Promise<Notebook> {
  const target = period ?? currentPeriod(session);
  if (!target) throw new Error("Aucune période disponible.");
  return notebook(session, target);
}

export async function fetchTimetableRange(
  session: SessionHandle,
  start: Date,
  end?: Date
): Promise<Timetable> {
  return timetableFromIntervals(session, start, end);
}

export async function fetchAssignmentsRange(
  session: SessionHandle,
  start: Date,
  end: Date
): Promise<Assignment[]> {
  return assignmentsFromIntervals(session, start, end);
}

export async function setAssignmentDone(
  session: SessionHandle,
  assignmentId: string,
  done: boolean
): Promise<void> {
  return assignmentStatus(session, assignmentId, done);
}
