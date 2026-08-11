// Assemble le sac de cours du prochain jour scolaire à partir du vrai emploi
// du temps -- pas d'invention : si l'emploi du temps ne donne rien, on
// renvoie null plutôt que de deviner.
import type { Timetable, Subject } from "pawnote";

export type NextSchoolDay = {
  date: Date;
  subjects: Subject[];
};

export function nextSchoolDay(timetable: Timetable | null | undefined, from: Date = new Date()): NextSchoolDay | null {
  if (!timetable) return null;

  const startOfTomorrow = new Date(from);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  startOfTomorrow.setHours(0, 0, 0, 0);

  const lessons = (timetable.classes ?? [])
    .filter((c: any) => c.is === "lesson" && !c.canceled && c.startDate >= startOfTomorrow)
    .sort((a: any, b: any) => a.startDate.getTime() - b.startDate.getTime()) as any[];

  if (lessons.length === 0) return null;

  // Le "prochain jour scolaire" = le jour du tout premier cours trouvé
  // (peut être demain, ou lundi si on est vendredi soir, etc.).
  const dayStart = new Date(lessons[0].startDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const sameDay = lessons.filter((c) => c.startDate >= dayStart && c.startDate < dayEnd);

  const seen = new Set<string>();
  const subjects: Subject[] = [];
  for (const c of sameDay) {
    if (c.subject && !seen.has(c.subject.id)) {
      seen.add(c.subject.id);
      subjects.push(c.subject);
    }
  }

  return { date: dayStart, subjects };
}
