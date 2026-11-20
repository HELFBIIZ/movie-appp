'use client';
import { OPEN_PLACEMENT_EVENT, placementBands } from '@/lib/learning/placement';
import { usePlacementProfile } from './usePlacementProfile';

export default function LearningProfile({
  showTranslations,
  onTranslations,
}: {
  showTranslations: boolean;
  onTranslations: (show: boolean) => void;
}) {
  const { profile, loaded, error } = usePlacementProfile();
  if (!loaded) return null;
  return (
    <div className="mt-4 border-t border-white/10 pt-3 text-sm" aria-label="Миний эхлэх түвшин">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-300">
          {profile
            ? `${placementBands[profile.band].label} · Хичээлд ${placementBands[profile.band].words} үг`
            : 'Өөрт тохирох түвшнээс эхлээрэй.'}
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_PLACEMENT_EVENT))}
          className="text-amber-200 hover:underline"
        >
          {profile ? 'Түвшнээ дахин шалгах' : '2 минутын тест'}
        </button>
      </div>
      {profile && (
        <button
          type="button"
          aria-pressed={showTranslations}
          onClick={() => onTranslations(!showTranslations)}
          className="mt-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400"
        >
          Монгол тайлбар: {showTranslations ? 'харагдана' : 'нуусан'}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-amber-200">
          {error}
        </p>
      )}
    </div>
  );
}
