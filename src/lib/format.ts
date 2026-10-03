import { GradeKind, type GradeValue } from "pawnote";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

export function formatGradeValue(value?: GradeValue): string {
  if (!value) return "—";
  switch (value.kind) {
    case GradeKind.Grade:
      return value.points.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    case GradeKind.Absent:
    case GradeKind.AbsentZero:
      return "Abs.";
    case GradeKind.Exempted:
      return "Disp.";
    case GradeKind.NotGraded:
      return "N.Not";
    case GradeKind.Unfit:
      return "Inapte";
    case GradeKind.Unreturned:
    case GradeKind.UnreturnedZero:
      return "N.Rendu";
    case GradeKind.Congratulations:
      return "Félic.";
    default:
      return "—";
  }
}

export function gradeOn20(value?: GradeValue, outOf?: GradeValue): number | null {
  if (!value || value.kind !== GradeKind.Grade) return null;
  const denom = outOf?.points || 20;
  if (!denom) return null;
  return (value.points / denom) * 20;
}

export function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return "Demain";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
}

export function formatShortDay(date: Date): string {
  return format(date, "EEE d", { locale: fr });
}

export function formatTime(date: Date): string {
  return format(date, "HH:mm", { locale: fr });
}

export function formatDayOfWeekLetter(date: Date): string {
  return format(date, "EEEEEE", { locale: fr }).toUpperCase();
}

// Pronote ne renvoie pas toujours la moyenne générale (début de période, relevé
// sans moyenne). On se rabat alors sur la moyenne des moyennes de matières,
// puis sur celle des notes, plutôt que d'afficher un tiret.
export function moyenneGenerale(
  grades?: { overallAverage?: GradeValue; subjectsAverages?: readonly { student?: GradeValue }[]; grades?: readonly { value: GradeValue; outOf: GradeValue }[] } | null
): { value: number; estimee: boolean } | null {
  const o = grades?.overallAverage;
  if (o && o.kind === GradeKind.Grade && Number.isFinite(o.points)) return { value: o.points, estimee: false };
  const moy = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const m = moy((grades?.subjectsAverages ?? []).map((s) => gradeOn20(s.student)).filter((v): v is number => v !== null));
  if (m !== null) return { value: m, estimee: true };
  const n = moy((grades?.grades ?? []).map((g) => gradeOn20(g.value, g.outOf)).filter((v): v is number => v !== null));
  return n !== null ? { value: n, estimee: true } : null;
}
