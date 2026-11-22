export const PLACEMENT_KEY = 'vxnta.scenechain.placement.v1';
export const PLACEMENT_DISMISSED_KEY = 'vxnta.scenechain.placement.dismissed.v1';
export const PLACEMENT_EVENT = 'vxnta:placement-change';
export const OPEN_PLACEMENT_EVENT = 'vxnta:placement-open';
export type PlacementSkill = 'vocabulary' | 'grammar' | 'reading';
export type PlacementBand = 'beginner' | 'foundation' | 'intermediate';
type PlacementQuestion = {
  id: string;
  skill: PlacementSkill;
  difficulty: 'basic' | 'daily' | 'challenge';
  scene: string;
  context?: string;
  prompt: string;
  choices: readonly string[];
  answer: string;
};

// Original mini scenarios. These are not dialogue from any catalogue movie.
export const placementQuestions: readonly PlacementQuestion[] = [
  {
    id: 'greeting',
    skill: 'vocabulary',
    difficulty: 'basic',
    scene: '👋 Найзтайгаа таарлаа',
    context: 'Hey, how’s it going?',
    prompt: 'Найз чинь юу асууж байна вэ?',
    choices: ['Хаашаа явж байгааг', 'Сонин сайхан, ямар байгааг', 'Хэдэн цаг болсныг'],
    answer: 'Сонин сайхан, ямар байгааг',
  },
  {
    id: 'habit',
    skill: 'grammar',
    difficulty: 'basic',
    scene: '🍿 Кино үздэг өдөр',
    context: 'I ___ to the movies on Fridays.',
    prompt: 'Хоосон зайд аль үг тохирох вэ?',
    choices: ['goes', 'going', 'go'],
    answer: 'go',
  },
  {
    id: 'meeting',
    skill: 'reading',
    difficulty: 'daily',
    scene: '🎟️ Уулзах цагаа тохиръё',
    context: 'The show starts at 7:30. Let’s meet fifteen minutes early.',
    prompt: 'Хэдэн цагт уулзах вэ?',
    choices: ['7:15', '7:30', '7:45'],
    answer: '7:15',
  },
  {
    id: 'anticipation',
    skill: 'vocabulary',
    difficulty: 'daily',
    scene: '✨ Маргаашийн төлөвлөгөө',
    context: 'We’re seeing a new film tomorrow. I’m looking forward to it!',
    prompt: 'Сүүлийн өгүүлбэр ямар утгатай вэ?',
    choices: ['Би түүнийг хайж байна.', 'Би аль хэдийн үзсэн.', 'Би тэсэн ядан хүлээж байна.'],
    answer: 'Би тэсэн ядан хүлээж байна.',
  },
  {
    id: 'condition',
    skill: 'grammar',
    difficulty: 'challenge',
    scene: '⏳ Дахиад үзмээр байна',
    context: 'If I ___ more time, I’d watch it again.',
    prompt: 'Аль үг тохирох вэ?',
    choices: ['have', 'had', 'will have'],
    answer: 'had',
  },
  {
    id: 'choice',
    skill: 'reading',
    difficulty: 'challenge',
    scene: '💬 Чатын нэг зурвас',
    context: 'Mina said she had already seen the film, so we picked a different one.',
    prompt: 'Яагаад өөр кино сонгосон бэ?',
    choices: ['Мина өмнөхийг нь үзсэн байсан.', 'Тасалбар дууссан.', 'Кино эхлээгүй байсан.'],
    answer: 'Мина өмнөхийг нь үзсэн байсан.',
  },
  {
    id: 'opinion',
    skill: 'reading',
    difficulty: 'challenge',
    scene: '⭐ Үзэгчийн сэтгэгдэл',
    context: 'Although the tickets were pricey, the audience felt the show was worth it.',
    prompt: 'Үзэгчид юу гэж үзсэн бэ?',
    choices: [
      'Үнэ хямд учраас таалагдсан.',
      'Өндөр үнэтэй ч үзэхэд үнэ цэнтэй байсан.',
      'Өндөр үнэтэй, таалагдаагүй.',
    ],
    answer: 'Өндөр үнэтэй ч үзэхэд үнэ цэнтэй байсан.',
  },
  {
    id: 'past',
    skill: 'grammar',
    difficulty: 'challenge',
    scene: '🏃 Жаахан хоцорчихлоо',
    context: 'By the time we arrived, the film ___.',
    prompt: 'Аль нь үйл явдлын дарааллыг зөв илэрхийлэх вэ?',
    choices: ['starts', 'is starting', 'had started'],
    answer: 'had started',
  },
];

export const placementBands = {
  beginner: {
    label: 'Анхан',
    words: 3,
    showTranslations: true,
    plan: 'Монгол тайлбартай нэг өгүүлбэрийг сонсоод, 3 үг хадгалж эхэлье.',
  },
  foundation: {
    label: 'Суурьтай',
    words: 5,
    showTranslations: true,
    plan: 'Өгүүлбэрийн утгыг таагаад, монгол тайлбартай тулгаж 5 үг суръя.',
  },
  intermediate: {
    label: 'Дунд',
    words: 8,
    showTranslations: false,
    plan: 'Эхлээд англиар ойлгож үзээд, хэрэгтэй үедээ монгол тайлбарыг нээгээрэй. Зорилго: 8 үг.',
  },
} as const;
export type PlacementAnswers = Record<string, string | null>;
export type PlacementProfile = {
  band: PlacementBand;
  correct: number;
  total: number;
  skills: Record<PlacementSkill, { correct: number; total: number }>;
  completedAt: number;
};

export function assessPlacement(answers: PlacementAnswers, completedAt: number): PlacementProfile {
  if (
    !answers ||
    typeof answers !== 'object' ||
    Array.isArray(answers) ||
    Object.keys(answers).length !== placementQuestions.length ||
    !Number.isSafeInteger(completedAt) ||
    completedAt < 0
  )
    throw new Error('Тестийн хариултын бүтэц буруу байна.');
  const skills = {
    vocabulary: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 },
    reading: { correct: 0, total: 0 },
  };
  let correct = 0,
    basics = 0,
    challenges = 0;
  for (const question of placementQuestions) {
    if (
      !Object.hasOwn(answers, question.id) ||
      (answers[question.id] !== null && !question.choices.includes(answers[question.id]!))
    )
      throw new Error('Тестийн хариулт дутуу эсвэл танигдахгүй байна.');
    const right = answers[question.id] === question.answer;
    skills[question.skill].total++;
    if (right) {
      correct++;
      skills[question.skill].correct++;
      if (question.difficulty === 'basic') basics++;
      if (question.difficulty === 'challenge') challenges++;
    }
  }
  // Conservative, hand-authored starting recommendations, not validated CEFR scores.
  const band =
    correct >= 7 && basics === 2 && challenges >= 3
      ? 'intermediate'
      : correct >= 4 && basics >= 1
        ? 'foundation'
        : 'beginner';
  return { band, correct, total: placementQuestions.length, skills, completedAt };
}

export function decodePlacement(raw: string | null): PlacementProfile | null {
  if (!raw) return null;
  if (raw.length > 20000) throw new Error('Түвшний өгөгдлийн хэмжээ хэтэрсэн.');
  const data = JSON.parse(raw);
  if (!data || data.version !== 1) throw new Error('Түвшний өгөгдлийн хувилбар буруу байна.');
  return assessPlacement(data.answers, data.completedAt);
}

export function persistPlacement(
  storage: Pick<Storage, 'setItem'>,
  answers: PlacementAnswers,
  completedAt: number,
): PlacementProfile {
  const profile = assessPlacement(answers, completedAt);
  storage.setItem(PLACEMENT_KEY, JSON.stringify({ version: 1, answers, completedAt }));
  return profile;
}
