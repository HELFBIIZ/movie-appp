import { dictionaryMeaning, dictionaryMeanings } from './dictionary.ts';
import { teachingPhrases } from './teaching-phrases.ts';
import { teachingBasics } from './teaching-basics.ts';

export type WordLesson = {
  word: string;
  meaning: string;
  tip: string;
  example: string;
  translation: string;
  contextual: boolean;
  source: 'authored' | 'mymemory';
};
export function normalizeWord(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
}
function matches(pattern: RegExp, sentence: string, offset?: number) {
  return [...sentence.replace(/[’‘]/g, "'").matchAll(new RegExp(pattern.source, 'gi'))].filter(
    (match) =>
      offset === undefined || (match.index <= offset && offset < match.index + match[0].length),
  );
}
export function contextualWord(word: string, sentence: string, offset?: number): string {
  const normalized = normalizeWord(word);
  for (const entry of teachingPhrases) {
    const match = matches(entry.pattern, sentence, offset)[0]?.[0];
    if (match && normalizeWord(match).split(/\s+/).includes(normalized))
      return normalizeWord(match);
  }
  return normalized;
}
export function teachingLesson(word: string, sentence: string, offset?: number): WordLesson | null {
  const normalized = normalizeWord(word);
  for (const entry of teachingPhrases) {
    const match = matches(entry.pattern, sentence, offset)[0]?.[0];
    if (match && normalizeWord(match) === normalized)
      return {
        word: normalized,
        meaning: entry.meaning,
        tip: entry.tip,
        example: entry.example,
        translation: entry.translation,
        contextual: true,
        source: 'authored',
      };
  }
  const rules: Array<{ word: string; when: RegExp; meaning: string; tip: string }> = [
    {
      word: 'train',
      when: /\btrain\s+(?:me|you|him|her|them|us|hard|daily|every|for|to)\b/i,
      meaning: 'сургах; бэлтгэл хийх',
      tip: 'Энд галт тэрэг биш, сургах эсвэл бэлтгэл хийх гэсэн үйл үг.',
    },
    {
      word: 'leaves',
      when: /\b(?:green|fallen|autumn|tree)\s+leaves\b|\bleaves\s+(?:on|of|from)\s+(?:the |a )?tree\b/i,
      meaning: 'навчнууд',
      tip: 'Энд leave буюу явах үйл үг биш, leaf буюу навчийн олон тоо.',
    },
    {
      word: 'right',
      when: /\b(?:turn|on (?:the|your)|to (?:the|your)) right\b|\bright (?:side|hand)\b/i,
      meaning: 'баруун',
      tip: 'Энд чиглэл зааж байгаа тул “баруун” гэсэн утгатай.',
    },
    {
      word: 'right',
      when: /\b(?:you(?:'re| are)|that(?:'s| is)|am i) right\b/i,
      meaning: 'зөв',
      tip: 'Хүний хэлсэн зүйл зөв байгааг илэрхийлж байна.',
    },
    {
      word: 'like',
      when: /\b(?:look|looks|looked|sound|sounds|seem|seems) like\b/i,
      meaning: 'шиг; адилхан',
      tip: 'Энд дуртай байх тухай биш, төстэй байгааг хэлж байна.',
    },
    {
      word: 'miss',
      when: /\bmiss(?:ed|ing)?\s+(?:you|him|her|them|my family)\b/i,
      meaning: 'үгүйлэх',
      tip: 'Хүнээ санаж, хамт байхыг хүсэж байгааг хэлнэ.',
    },
    {
      word: 'lost',
      when: /\blost\s+(?:my|your|his|her|the|a)\b/i,
      meaning: 'гээсэн; алдсан',
      tip: 'Эд зүйлээ хаана байгааг мэдэхгүй болсон байна.',
    },
    {
      word: 'lost',
      when: /\b(?:am|are|is|was|were|got|feel|feels|i'm|we're)\s+lost\b/i,
      meaning: 'төөрсөн',
      tip: 'Хаашаа явахаа мэдэхгүй байгааг хэлнэ.',
    },
    {
      word: 'last',
      when: /\blast\s+(?:week|month|year|summer|winter|time)\b/i,
      meaning: 'өнгөрсөн',
      tip: 'Өмнөх хугацааны тухай ярьж байна.',
    },
    {
      word: 'fine',
      when: /\b(?:am|is|are|i'm|that's|feeling)\s+fine\b/i,
      meaning: 'зүгээр; сайн',
      tip: 'Бие, сэтгэл эсвэл нөхцөл байдал хэвийн байгааг хэлнэ.',
    },
    {
      word: 'light',
      when: /\b(?:bag|box|suitcase).{0,15}\blight\b|\blight\s+(?:bag|box|suitcase)\b/i,
      meaning: 'хөнгөн',
      tip: 'Энд гэрэл биш, жин бага гэсэн утгатай.',
    },
  ];
  const rule = rules.find(
    (entry) => entry.word === normalized && matches(entry.when, sentence, offset).length > 0,
  );
  const basic = teachingBasics[normalized];
  const meaning = rule?.meaning ?? basic?.meaning ?? dictionaryMeaning(normalized);
  return meaning
    ? {
        word: normalized,
        meaning,
        tip: rule?.tip ?? '',
        example: rule ? '' : (basic?.example ?? ''),
        translation: rule ? '' : (basic?.translation ?? ''),
        contextual: !!rule,
        source: 'authored',
      }
    : null;
}
export function meaningChoices(word: string, meaning: string): string[] {
  const candidates = dictionaryMeanings().filter(
    (value) => value !== meaning && !meaning.includes(value),
  );
  let hash = 0;
  for (const letter of word) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  const options = [
    candidates[hash % candidates.length],
    candidates[(hash + 37) % candidates.length],
  ];
  options.splice(hash % 3, 0, meaning);
  return [...new Set(options)];
}
