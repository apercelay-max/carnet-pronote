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
