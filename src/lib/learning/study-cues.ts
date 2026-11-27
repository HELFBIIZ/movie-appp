import type { AlignedCue } from './types.ts';
export function studyCues(cues: AlignedCue[]): AlignedCue[] {
  return cues.filter(
    (cue) =>
      cue.language !== 'mn' &&
      cue.text.length <= 500 &&
      /[a-z]{2}/i.test(cue.text) &&
      !/^\s*[[(].*[\])]\s*$/.test(cue.text) &&
      !/(?:https?:\/\/|www\.|opensubtitles|subtitles?\s+(?:by|from)|translated\s+by|synced?\s+by)/i.test(
        cue.text,
      ),
  );
}
