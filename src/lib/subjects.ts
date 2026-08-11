// Liste de toutes les matières connues, en combinant toutes les sources de
// données disponibles (notes, emploi du temps, devoirs, évaluations,
// contenu des cours) -- `grades.subjectsAverages` seul en oublie certaines
// (ex. EPS quand il n'y a pas encore de moyenne ce trimestre).
import type { Subject, GradesOverview, Timetable, Assignment, Evaluation, Resource } from "pawnote";

export function allKnownSubjects(data: {
  grades?: GradesOverview | null;
  timetable?: Timetable | null;
  assignments?: Assignment[];
  evaluations?: Evaluation[];
  resources?: Resource[];
}): Subject[] {
  const seen = new Map<string, Subject>();
  const add = (s?: Subject) => {
    if (s && !seen.has(s.id)) seen.set(s.id, s);
  };

  (data.grades?.subjectsAverages ?? []).forEach((s) => add(s.subject));
  (data.timetable?.classes ?? []).forEach((c: any) => add(c.subject));
  (data.assignments ?? []).forEach((a) => add(a.subject));
  (data.evaluations ?? []).forEach((e) => add(e.subject));
  (data.resources ?? []).forEach((r) => add(r.subject));

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
