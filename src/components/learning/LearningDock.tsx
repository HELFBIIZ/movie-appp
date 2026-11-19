'use client';
import { BookOpen, Sparkles } from 'lucide-react';
import { SAMPLE_TITLE } from '@/lib/learning/sample';
import LocalMediaInput from './LocalMediaInput';
import LearningVideo from './LearningVideo';
import WordPanel from './WordPanel';
import LearningPanels from './LearningPanels';
import LearningProgress from './LearningProgress';
import { useLearningController, type LearningSource } from './useLearningController';
type Props = {
  movieId: string;
  movieTitle: string;
  source: LearningSource;
  onSource: (source: LearningSource) => void;
};
export default function LearningDock({ movieId, movieTitle, source, onSource }: Props) {
  const controller = useLearningController(movieId, source);
  const { lesson, videoRef, active, setTime, setReady, selection, wordSaved, progress, save } =
    controller;

  return (
    <section
      aria-label="SceneChain Learning Dock"
      className="my-6 rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 p-5 md:p-6">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-[#c9a227]">
            <Sparkles size={16} aria-hidden="true" /> SceneChain Learning
          </p>
          <h2 className="text-2xl font-semibold">Нэг үзэгдэл. Шинэ ойлголт.</h2>
          <p className="mt-2 text-sm text-slate-400">{movieTitle} · Үзэж, ойлгож, тогтооно.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
          Browser-local · Cloud sync байхгүй
        </span>
      </div>
      <div className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Learning media source">
          {[
            { value: 'sample', label: 'Sample lesson' },
            { value: 'movie', label: 'Movie player' },
            { value: 'local', label: 'Local video + VTT' },
          ].map(({ value, label }) => (
            <button
              type="button"
              key={value}
              aria-pressed={source === value}
              onClick={() => onSource(value as LearningSource)}
              className={`rounded-lg border px-3 py-2 text-sm transition ${source === value ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-white/10 text-slate-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {source === 'movie' ? (
          <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="font-medium text-amber-200">Sync unavailable for this player</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Энэ iframe-д цаг унших болон seek хийх баталгаажсан API холбогдоогүй. Sample lesson
              сонгож бодит HTML video sync туршина уу. Киноны нэвтрэх эрхийн шалгалт хэвээр
              ажиллана.
            </p>
          </div>
        ) : (
          <p className="mb-4 text-sm leading-6 text-slate-400">
            {source === 'sample'
              ? `${SAMPLE_TITLE} · SceneChain-д зориулан бүтээсэн 38 секундийн original animated lesson, synthetic narration. Энэ киноны яриа эсвэл орчуулга биш.`
              : 'Local файл browser дотор тоглоно. Нээсэн файлаа refresh хийсний дараа дахин сонгоно.'}
          </p>
        )}
        {source === 'local' && (
          <div className="mb-4">
            <LocalMediaInput onLoad={lesson.loadLocal} />
          </div>
        )}
        <div
          className={`grid gap-5 ${source !== 'movie' ? 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]' : ''}`}
        >
          {source !== 'movie' && (
            <div className="min-w-0">
              {lesson.videoUrl && (
                <LearningVideo
                  key={lesson.videoUrl}
                  url={lesson.videoUrl}
                  videoRef={videoRef}
                  active={active}
                  onTime={setTime}
                  onReady={setReady}
                  sample={source === 'sample'}
                />
              )}
              {selection && (
                <WordPanel
                  selection={selection}
                  saved={wordSaved}
                  canSave={!!progress}
                  onSave={() => save('word', selection.cue, selection.note)}
                />
              )}
              {source === 'sample' && !selection && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 p-4 text-sm leading-6 text-slate-400">
                  <BookOpen className="shrink-0 text-[#c9a227]" size={19} aria-hidden="true" />
                  <p>
                    Transcript доторх доогуур зураастай үгийг сонго. Утга, тухайн үзэгдлийн
                    контекст, жишээ, дүрэм харна.
                  </p>
                </div>
              )}
            </div>
          )}
          <LearningPanels controller={controller} source={source} />
        </div>
        <LearningProgress controller={controller} />
      </div>
    </section>
  );
}
