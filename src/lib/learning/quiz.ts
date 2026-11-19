import type { LearningItem, Question } from './types.ts';

const fallbackMeanings = ['галт тэрэг', 'тасалбар', 'туслах', 'тавцан', 'цүнх', 'хамтдаа'];

export function vocabularyQuestions(items: LearningItem[]): Question[] {
  return items
    .filter((item) => item.kind === 'word' && item.meaning.trim())
    .map((item, index) => {
      const distractors = [
        ...new Set([
          ...items.filter((other) => other.id !== item.id).map((other) => other.meaning),
          ...fallbackMeanings,
        ]),
      ]
        .filter((meaning) => meaning.trim() && meaning !== item.meaning)
        .slice(0, 3);
      const choices = [...distractors];
      choices.splice(index % (choices.length + 1), 0, item.meaning);
      return {
        id: item.id,
        itemId: item.id,
        prompt: `“${item.word}” энэ өгүүлбэрт ямар утгатай вэ?\n${item.example}`,
        choices,
        answer: item.meaning,
        explanation: `${item.word}: ${item.meaning}`,
      };
    });
}

export function isCorrect(question: Question, choice: string): boolean {
  return question.choices.includes(choice) && question.answer === choice;
}
