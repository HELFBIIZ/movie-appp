import { z } from 'zod';
import { MAX_VTT_BYTES } from './vtt.ts';

const source = z.enum(['automatic', 'manual', 'legacy']);
export const captionSettingsSchema = z.object({
  english: z.string().max(MAX_VTT_BYTES),
  mongolian: z.string().max(MAX_VTT_BYTES).default(''),
  enOffset: z.number().finite().min(-600).max(600),
  mnOffset: z.number().finite().min(-600).max(600),
  englishSource: source.default('legacy'),
  mongolianSource: source.default('legacy'),
});
export const initialCaptionSettings: z.infer<typeof captionSettingsSchema> = {
  english: '',
  mongolian: '',
  enOffset: 0,
  mnOffset: 0,
  englishSource: 'automatic',
  mongolianSource: 'automatic',
};

export function mergeAutomaticCaptions(
  saved: z.infer<typeof captionSettingsSchema>,
  received: { english: string; mongolian: string },
) {
  const next = { ...saved };
  for (const language of ['english', 'mongolian'] as const) {
    const key = language === 'english' ? 'englishSource' : 'mongolianSource';
    if (saved[key] === 'automatic' || !saved[language] || saved[language] === received[language]) {
      next[language] = received[language];
      next[key] = 'automatic';
    }
  }
  return next;
}
