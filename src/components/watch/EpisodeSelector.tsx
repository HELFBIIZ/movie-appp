import { useId } from 'react';
type Props = {
  isTV: boolean;
  totalEpisodes: number;
  totalSeasons: number;
  season: number;
  episode: number;
  setSeason: (value: number) => void;
  setEpisode: (value: number) => void;
};
export default function EpisodeSelector({
  isTV,
  totalEpisodes,
  totalSeasons,
  season,
  episode,
  setSeason,
  setEpisode,
}: Props) {
  const id = useId();
  return (
    <>
      {isTV && totalEpisodes > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 animate-fade-in-up delay-100">
          <label htmlFor={`${id}-season`} className="text-sm text-slate-400">
            Season
          </label>
          <select
            id={`${id}-season`}
            value={season}
            onChange={(e) => {
              setSeason(Number(e.target.value));
              setEpisode(1);
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-[#d6b456] focus:outline-none"
          >
            {Array.from({ length: totalSeasons }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>

          <label htmlFor={`${id}-episode`} className="text-sm text-slate-400">
            Episode
          </label>
          <select
            id={`${id}-episode`}
            value={episode}
            onChange={(e) => setEpisode(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-[#d6b456] focus:outline-none"
          >
            {Array.from({ length: totalEpisodes }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
