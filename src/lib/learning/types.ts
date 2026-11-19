export type Cue = { id: string; start: number; end: number; text: string };
export type AlignedCue = Cue & { translation: string };
export type WordNote = {
  word: string;
  meaning: string;
  context: string;
  example: string;
  grammar: string;
};
export type LearningItem = {
  id: string;
  kind: 'word' | 'sentence';
  word: string;
  meaning: string;
  example: string;
  movieId: string;
  mediaId: string;
  cueStart: number;
  cueEnd: number;
  stage: number;
  correct: number;
  incorrect: number;
  dueAt: number;
  savedAt: number;
};
export type Progress = {
  items: LearningItem[];
  contextCorrect: number;
  contextIncorrect: number;
};
export type Question = {
  id: string;
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
  itemId?: string;
};
