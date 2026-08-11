// Jeu de données de démo — même forme que ce que renvoie pawnote (GradesOverview,
// Timetable, Assignment[], Notebook). Sert au mode "Voir une démo" sans compte,
// et à construire l'UI avant de brancher un vrai Pronote.

import {
  GradeKind,
  AssignmentDifficulty,
  AssignmentReturnKind,
  NotebookObservationKind,
  type GradesOverview,
  type Timetable,
  type Assignment,
  type Notebook,
  type Subject,
} from "pawnote";

function subject(id: string, name: string): Subject {
  return { id, name, inGroups: false };
}

const S = {
  maths: subject("s1", "Mathématiques"),
  francais: subject("s2", "Français"),
  anglais: subject("s3", "Anglais"),
  hg: subject("s4", "Histoire-Géographie"),
  svt: subject("s5", "SVT"),
  physique: subject("s6", "Physique-Chimie"),
  eps: subject("s7", "EPS"),
  espagnol: subject("s8", "Espagnol"),
  techno: subject("s9", "Technologie"),
};

function grade(points: number, outOf = 20) {
  return { kind: GradeKind.Grade, points };
}

function todayAt(hour: number, minute: number, dayOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const MOCK_GRADES: GradesOverview = {
  overallAverage: grade(14.6),
  classAverage: grade(13.1),
  subjectsAverages: [
    { subject: S.maths, student: grade(15.2), class_average: grade(12.8), backgroundColor: "#4FA6FF" },
    { subject: S.francais, student: grade(13.4), class_average: grade(12.9), backgroundColor: "#FF6B57" },
    { subject: S.anglais, student: grade(16.8), class_average: grade(14.2), backgroundColor: "#2DD4A7" },
    { subject: S.hg, student: grade(12.9), class_average: grade(12.5), backgroundColor: "#FFB020" },
    { subject: S.svt, student: grade(15.5), class_average: grade(13.6), backgroundColor: "#B26CFF" },
    { subject: S.physique, student: grade(13.0), class_average: grade(11.9), backgroundColor: "#FF5FA8" },
    { subject: S.eps, student: grade(17.0), class_average: grade(15.1), backgroundColor: "#6C7BFF" },
    { subject: S.espagnol, student: grade(14.1), class_average: grade(13.4), backgroundColor: "#5FD1D1" },
  ],
  grades: [
    { id: "g1", value: grade(16), outOf: grade(20), date: todayAt(9, 0, -1), subject: S.maths, average: grade(13.2), coefficient: 2, comment: "Contrôle chapitre fonctions", isBonus: false, isOptional: false, isOutOf20: true },
    { id: "g2", value: grade(12.5), outOf: grade(20), date: todayAt(9, 0, -2), subject: S.francais, average: grade(11.8), coefficient: 1, comment: "Dissertation", isBonus: false, isOptional: false, isOutOf20: true },
    { id: "g3", value: grade(18), outOf: grade(20), date: todayAt(9, 0, -3), subject: S.anglais, average: grade(14.9), coefficient: 1, comment: "Oral", isBonus: false, isOptional: false, isOutOf20: true },
    { id: "g4", value: grade(9), outOf: grade(20), date: todayAt(9, 0, -5), subject: S.physique, average: grade(11.2), coefficient: 1, comment: "Devoir surveillé", isBonus: false, isOptional: false, isOutOf20: true },
    { id: "g5", value: grade(15), outOf: grade(20), date: todayAt(9, 0, -6), subject: S.svt, average: grade(13.9), coefficient: 1, comment: "Exposé écosystèmes", isBonus: false, isOptional: false, isOutOf20: true },
    { id: "g6", value: grade(20), outOf: grade(20), date: todayAt(9, 0, -8), subject: S.eps, average: grade(15.6), coefficient: 1, comment: "Course de demi-fond", isBonus: false, isOptional: false, isOutOf20: true },
  ],
};

function lesson(
  id: string,
  subj: Subject,
  start: Date,
  minutes: number,
  room: string,
  teacher: string,
  extra: Partial<{ canceled: boolean; test: boolean }> = {}
) {
  const end = new Date(start.getTime() + minutes * 60000);
  return {
    id,
    is: "lesson" as const,
    kind: 1,
    backgroundColor: undefined,
    startDate: start,
    endDate: end,
    blockLength: 1,
    blockPosition: 0,
    weekNumber: 1,
    canceled: extra.canceled ?? false,
    exempted: false,
    test: extra.test ?? false,
    virtualClassrooms: [],
    personalNames: [],
    teacherNames: [teacher],
    classrooms: [room],
    groupNames: [],
    subject: subj,
    status: undefined,
  } as any;
}

export const MOCK_TIMETABLE: Timetable = {
  withCanceledClasses: true,
  absences: [],
  classes: [
    lesson("t1", S.maths, todayAt(8, 0, 0), 55, "Salle 204", "M. Dubreuil"),
    lesson("t2", S.francais, todayAt(9, 0, 0), 55, "Salle 108", "Mme Lacroix"),
    lesson("t3", S.anglais, todayAt(10, 10, 0), 55, "Salle 301", "Mrs Owens", { test: true }),
    lesson("t4", S.eps, todayAt(14, 0, 0), 110, "Gymnase", "M. Ferreira"),
    lesson("t5", S.svt, todayAt(8, 0, 1), 55, "Labo 2", "Mme Ionescu"),
    lesson("t6", S.hg, todayAt(9, 0, 1), 55, "Salle 112", "M. Petit", { canceled: true }),
    lesson("t7", S.physique, todayAt(10, 10, 1), 55, "Labo 1", "M. Nasser"),
    lesson("t8", S.espagnol, todayAt(13, 0, 1), 55, "Salle 207", "Sra. Molina"),
    lesson("t9", S.physique, todayAt(10, 10, 4), 55, "Labo 1", "M. Nasser", { test: true }),
    lesson("t10", S.hg, todayAt(9, 0, 8), 55, "Salle 112", "M. Petit", { test: true }),
    lesson("t11", S.maths, todayAt(8, 0, 13), 55, "Salle 204", "M. Dubreuil", { test: true }),
  ],
};

function assignment(
  id: string,
  subj: Subject,
  description: string,
  dayOffset: number,
  done = false,
  minutes = 20,
  difficulty: AssignmentDifficulty = AssignmentDifficulty.Medium
): Assignment {
  return {
    id,
    subject: subj,
    description,
    backgroundColor: "#4FA6FF",
    done,
    deadline: todayAt(8, 0, dayOffset),
    attachments: [],
    difficulty,
    length: minutes,
    themes: [],
    return: { kind: AssignmentReturnKind.None, canUpload: false },
  };
}

export const MOCK_ASSIGNMENTS: Assignment[] = [
  assignment("a1", S.maths, "Exercices 12 à 18 p.64 — fonctions affines", 1, false, 25, AssignmentDifficulty.Medium),
  assignment("a2", S.francais, "Lire le chapitre 3 de « La Peste » et préparer 3 questions", 2, false, 40, AssignmentDifficulty.Hard),
  assignment("a3", S.anglais, "Vocabulaire unit 5 à réviser pour le test oral", 3, false, 15, AssignmentDifficulty.Easy),
  assignment("a4", S.svt, "Compléter le compte-rendu de l'expérience sur la photosynthèse", 4, false, 30, AssignmentDifficulty.Medium),
  assignment("a5", S.hg, "Fiche de révision : la Révolution française", 6, false, 35, AssignmentDifficulty.Hard),
  assignment("a6", S.techno, "Terminer le schéma du circuit électrique", -1, true, 20, AssignmentDifficulty.Easy),
];

export const MOCK_NOTEBOOK: Notebook = {
  absences: [],
  delays: [
    {
      id: "d1",
      date: todayAt(8, 5, -4),
      minutes: 10,
      justified: true,
      justification: "Retard de bus",
      shouldParentsJustify: false,
      administrativelyFixed: true,
      isReasonUnknown: false,
      reason: "Transport",
    },
  ],
  punishments: [],
  precautionaryMeasures: [],
  observations: [
    {
      id: "o1",
      date: todayAt(9, 0, -2),
      opened: true,
      shouldParentsJustify: false,
      name: "Excellente participation en cours",
      kind: NotebookObservationKind.Encouragement,
      sectionID: "sec1",
      subject: S.svt,
    },
  ],
};
