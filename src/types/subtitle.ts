/** Legacy subtitle conversion contract; timing strings are deliberately preserved. */
export interface SubtitleCue {
  id: string;
  timing: string;
  text: string;
}
