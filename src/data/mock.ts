// Jeu de données de démo — même forme que ce que renvoie pawnote (GradesOverview,
// Timetable, Assignment[], Notebook). Sert au mode "Voir une démo" sans compte,
// et à construire l'UI avant de brancher un vrai Pronote.

import {
  GradeKind,
  AssignmentDifficulty,
  AssignmentReturnKind,
  NotebookObservationKind,
  ResourceContentCategory,
  EntityKind,
  NewsQuestionKind,
  type GradesOverview,
  type Timetable,
  type Assignment,
  type Notebook,
  type Subject,
  type Evaluation,
  type Resource,
  type Discussions,
  type DiscussionMessages,
  type News,
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

// --- Compétences évaluées -------------------------------------------------

function skill(
  id: string,
  order: number,
  level: string,
  abbreviation: string,
  domainName: string,
  pillarName: string,
  pillarPrefixes: string[]
) {
  return {
    id,
    order,
    level,
    abbreviation,
    coefficient: 1,
    domainID: `dom-${id}`,
    domainName,
    pillarID: `pil-${id}`,
    pillarName,
    pillarPrefixes,
  };
}

export const MOCK_EVALUATIONS: Evaluation[] = [
  {
    id: "ev1",
    name: "Étude d'un écosystème",
    teacher: "Mme Ionescu",
    coefficient: 2,
    description: "Analyse d'un écosystème local et de ses chaînes alimentaires.",
    subject: S.svt,
    levels: ["Cycle 4"],
    date: todayAt(9, 0, -6),
    skills: [
      skill("s-ev1-1", 1, "Maîtrise satisfaisante", "M", "Pratiquer des démarches scientifiques", "Systèmes naturels et systèmes techniques", ["D4"]),
      skill("s-ev1-2", 2, "Très bonne maîtrise", "TB", "Concevoir, créer, réaliser", "Systèmes naturels et systèmes techniques", ["D4", "D5"]),
    ],
  },
  {
    id: "ev2",
    name: "Compréhension orale — unit 5",
    teacher: "Mrs Owens",
    coefficient: 1,
    description: "Restitution d'un dialogue enregistré et questions de compréhension.",
    subject: S.anglais,
    levels: ["Cycle 4"],
    date: todayAt(10, 10, -3),
    skills: [
      skill("s-ev2-1", 1, "Maîtrise fragile", "F", "Comprendre, s'exprimer en utilisant la langue étrangère", "Langues étrangères", ["D1.2"]),
    ],
  },
  {
    id: "ev3",
    name: "Résolution de problèmes — fonctions",
    teacher: "M. Dubreuil",
    coefficient: 2,
    description: "Modélisation d'une situation concrète à l'aide de fonctions affines.",
    subject: S.maths,
    levels: ["Cycle 4"],
    date: todayAt(8, 0, -1),
    skills: [
      skill("s-ev3-1", 1, "Très bonne maîtrise", "TB", "Chercher, modéliser, raisonner", "Nombres et calculs", ["D4"]),
      skill("s-ev3-2", 2, "Maîtrise satisfaisante", "M", "Représenter", "Nombres et calculs", ["D1.1"]),
    ],
  },
];

// --- Contenu des cours -----------------------------------------------------

function resource(
  id: string,
  subj: Subject,
  dayOffset: number,
  hour: number,
  minute: number,
  minutes: number,
  title: string,
  description: string,
  category: number
): Resource {
  const start = todayAt(hour, minute, dayOffset);
  return {
    id,
    startDate: start,
    endDate: new Date(start.getTime() + minutes * 60000),
    subject: subj,
    haveAssignment: false,
    backgroundColor: "#4FA6FF",
    contents: [
      {
        id: `${id}-c1`,
        title,
        description,
        category: category as any,
        files: [],
        themes: [],
        educativeValue: -1,
      },
    ],
    teachers: [],
    groups: [],
  };
}

export const MOCK_RESOURCES: Resource[] = [
  resource("r1", S.maths, 0, 8, 0, 55, "Fonctions affines", "Définition, représentation graphique et coefficient directeur.", ResourceContentCategory.LESSON),
  resource("r2", S.francais, 0, 9, 0, 55, "« La Peste » — chapitre 3", "Lecture analytique et relevé des figures de style.", ResourceContentCategory.LESSON),
  resource("r3", S.svt, 1, 8, 0, 55, "Photosynthèse", "Correction du compte-rendu d'expérience.", ResourceContentCategory.CORRECTION),
  resource("r4", S.anglais, 0, 10, 10, 55, "Unit 5 — vocabulary", "Révisions avant le test oral.", ResourceContentCategory.TD),
  resource("r5", S.physique, 4, 10, 10, 55, "Réactions chimiques", "Préparation du devoir sur table.", ResourceContentCategory.DST),
];

// --- Messagerie --------------------------------------------------------

export const MOCK_DISCUSSIONS: Discussions = {
  folders: [],
  items: [
    {
      creator: "Mme Ionescu",
      recipientName: "Mme Ionescu (SVT)",
      date: todayAt(11, 30, -1),
      participantsMessageID: "disc-1",
      possessions: null,
      subject: "Compte-rendu de l'expérience",
      numberOfDrafts: 0,
      numberOfMessages: 2,
      numberOfMessagesUnread: 1,
      folders: [],
      closed: false,
      cache: { _: [] },
    },
    {
      creator: "Vie scolaire",
      recipientName: "Vie scolaire",
      date: todayAt(8, 15, -4),
      participantsMessageID: "disc-2",
      possessions: null,
      subject: "Retard du 7 août",
      numberOfDrafts: 0,
      numberOfMessages: 1,
      numberOfMessagesUnread: 0,
      folders: [],
      closed: true,
      cache: { _: [] },
    },
  ],
};

export const MOCK_DISCUSSION_MESSAGES: Record<string, DiscussionMessages> = {
  "disc-1": {
    defaultReplyMessageID: "msg-1b",
    sents: [
      {
        id: "msg-1a",
        content: "Bonjour, votre compte-rendu sur la photosynthèse est bien reçu, merci.",
        creationDate: todayAt(11, 30, -1),
        author: { name: "Mme Ionescu", kind: EntityKind.Teacher },
        partialVisibility: false,
        amountOfRecipients: 1,
        files: [],
        replyMessageID: "msg-1a",
        transferredMessages: [],
      },
      {
        id: "msg-1b",
        content: "Merci, je vous préviens si j'ai une question sur la suite.",
        creationDate: todayAt(11, 45, -1),
        partialVisibility: false,
        amountOfRecipients: 1,
        files: [],
        replyMessageID: "msg-1b",
        replyingTo: undefined,
        transferredMessages: [],
      },
    ],
    drafts: [],
    canIncludeStudentsAndParents: false,
  },
  "disc-2": {
    defaultReplyMessageID: "msg-2a",
    sents: [
      {
        id: "msg-2a",
        content: "Un retard de 10 minutes a été enregistré ce matin (transport). Justification acceptée.",
        creationDate: todayAt(8, 15, -4),
        author: { name: "Vie scolaire", kind: EntityKind.Personal },
        partialVisibility: false,
        amountOfRecipients: 1,
        files: [],
        replyMessageID: "msg-2a",
        transferredMessages: [],
      },
    ],
    drafts: [],
    canIncludeStudentsAndParents: false,
  },
};

// --- Actualités --------------------------------------------------------

const NEWS_CATEGORY_ETABLISSEMENT = { id: "cat1", name: "Établissement", default: true };

export const MOCK_NEWS: News = {
  categories: [NEWS_CATEGORY_ETABLISSEMENT],
  items: [
    {
      id: "news1",
      title: "Sorties pédagogiques — inscriptions ouvertes",
      category: NEWS_CATEGORY_ETABLISSEMENT,
      creationDate: todayAt(9, 0, -2),
      startDate: todayAt(9, 0, -2),
      endDate: todayAt(9, 0, 10),
      author: "Vie scolaire",
      public: null,
      read: false,
      is: "information",
      get attachments() {
        return [];
      },
      get acknowledged() {
        return false;
      },
      get acknowledgedDate() {
        return undefined;
      },
      get needToAcknowledge() {
        return false;
      },
      get content() {
        return "Les inscriptions pour la sortie au musée des sciences sont ouvertes jusqu'au 20 août.";
      },
      question: {
        id: "q1",
        position: 0,
        kind: NewsQuestionKind.InformationText,
        fullTitle: "Sorties pédagogiques — inscriptions ouvertes",
        title: "Sorties pédagogiques — inscriptions ouvertes",
        shouldRespectMaximumChoices: false,
        maximumChoices: 0,
        maximumLength: 0,
        attachments: [],
        content: "Les inscriptions pour la sortie au musée des sciences sont ouvertes jusqu'au 20 août.",
        answerID: "",
        shouldAnswer: false,
        choices: [],
        answered: false,
      },
    } as any,
    {
      id: "news2",
      title: "Fermeture exceptionnelle du CDI",
      category: NEWS_CATEGORY_ETABLISSEMENT,
      creationDate: todayAt(14, 0, -5),
      startDate: todayAt(14, 0, -5),
      endDate: todayAt(9, 0, 3),
      author: "Direction",
      public: null,
      read: true,
      is: "information",
      get attachments() {
        return [];
      },
      get acknowledged() {
        return false;
      },
      get acknowledgedDate() {
        return undefined;
      },
      get needToAcknowledge() {
        return false;
      },
      get content() {
        return "Le CDI sera fermé vendredi après-midi pour inventaire.";
      },
      question: {
        id: "q2",
        position: 0,
        kind: NewsQuestionKind.InformationText,
        fullTitle: "Fermeture exceptionnelle du CDI",
        title: "Fermeture exceptionnelle du CDI",
        shouldRespectMaximumChoices: false,
        maximumChoices: 0,
        maximumLength: 0,
        attachments: [],
        content: "Le CDI sera fermé vendredi après-midi pour inventaire.",
        answerID: "",
        shouldAnswer: false,
        choices: [],
        answered: false,
      },
    } as any,
  ],
};
