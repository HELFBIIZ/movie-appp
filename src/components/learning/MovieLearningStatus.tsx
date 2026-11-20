'use client';
import { formatTime } from '@/lib/learning/vtt';
import { CINESRC_DOCS } from '@/lib/learning/player-adapter/cinesrc';
import type { MoviePlayerContext } from './useMoviePlayer';
import type { LearningController } from './useLearningController';

export default function MovieLearningStatus({
  controller,
  context,
}: {
  controller: LearningController;
  context?: MoviePlayerContext;
}) {
  const { movieLesson: lesson, moviePlayer: player, active } = controller;
  return (
    <div className="mb-5 space-y-4">
      <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
        <p className="font-semibold text-amber-200">Spider-Man: Brand New Day · TMDB 969681</p>
        <p className="mt-2 text-sm leading-6 text-amber-100">
          Одоогийн MN хадмал — баталгаажаагүй. Киноны edition, орчуулга, offset болон ашиглах эрхийг
          шалгаагүй. EN dialogue шинээр зохиогоогүй.
        </p>
        {!context?.allowed ? (
          <p role="status" className="mt-3 text-sm text-slate-300">
            Кино болон киноны transcript нээхийн өмнө VXNTA-д нэвтэрч, VIP эрхээ баталгаажуулна уу.
          </p>
        ) : context.provider !== 'cine' ? (
          <div className="mt-3">
            <p role="status" className="text-sm text-slate-300">
              Sync unavailable for this player
            </p>
            <button
              type="button"
              onClick={() => context.onSelectProvider('cine')}
              className="mt-3 rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Player 2 · CineSrc сонгох
            </button>
          </div>
        ) : (
          <p role="status" className="mt-3 text-sm text-slate-300">
            {player.time === null
              ? 'CineSrc-ийн бодит timeupdate event хүлээж байна. Clock/seek хараахан батлагдаагүй.'
              : `CineSrc-ээс ирсэн цаг: ${formatTime(player.time)} / ${formatTime(player.duration ?? 0)}. Энэ нь киноны агуулга, хадмалын таарцыг батлахгүй.`}
          </p>
        )}
        {player.status === 'seek-pending' && (
          <p role="status" className="mt-2 text-sm text-amber-200">
            Seek хүсэлт илгээсэн. Player-ийн seeked event-ийг хүлээж байна.
          </p>
        )}
        {player.status === 'seek-unconfirmed' && (
          <p role="alert" className="mt-2 text-sm text-rose-300">
            Seek баталгаажаагүй. Хадмалын цагийг хиймлээр шилжүүлээгүй.
          </p>
        )}
        {player.status === 'error' && (
          <p role="alert" className="mt-2 text-sm text-rose-300">
            CineSrc алдааны event ирүүллээ. Өөр source эсвэл өөрийн local video ашиглана уу.
          </p>
        )}
        <p className="mt-3 text-sm text-slate-400">
          Runtime: time {player.capabilities.getCurrentTime ? 'event received' : 'unverified'} ·
          seek {player.capabilities.seek ? 'acknowledged' : 'unverified'} ·{' '}
          <a href={CINESRC_DOCS} target="_blank" rel="noreferrer" className="underline">
            Provider API docs
          </a>
          . Provider-ийн message нь signed film identity өгдөггүй.
        </p>
      </div>
      {context?.allowed && lesson.supported && (
        <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
          <p className="text-sm text-slate-300">
            MN: {lesson.mnCount} cue · EN:{' '}
            {lesson.hasEnglish ? `${lesson.enCount} cue — өөрийн импорт` : 'байхгүй'}. Цагийн offset
            default 0; бодит видео дээр гараар шалгана.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            <a href="#watch-subtitle-panel" className="text-amber-200 underline">
              Existing Subtitles panel
            </a>
            -аас English сонгож Load хийвэл энд холбоно. Эх сурвалжийг шалгаагүй; source нээгдэхгүй
            бол өөрийн EN VTT импортлоно.
          </p>
          <label className="mt-3 block text-sm text-slate-300">
            Кинотой таарах English VTT (browser-local)
            <input
              type="file"
              accept=".vtt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void lesson.loadEnglish(file);
              }}
              className="mt-2 block w-full min-w-0 rounded-lg border border-white/10 p-2 text-sm"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-4">
            {(['en', 'mn'] as const).map((language) => (
              <label key={language} className="text-sm text-slate-400">
                {language.toUpperCase()} offset (сек)
                <input
                  type="number"
                  min={-600}
                  max={600}
                  step={0.1}
                  value={language === 'en' ? lesson.enOffset : lesson.mnOffset}
                  onChange={(event) => lesson.changeOffset(language, event.target.valueAsNumber)}
                  className="ml-2 w-24 rounded border border-white/15 bg-slate-950 p-2 text-white"
                />
              </label>
            ))}
          </div>
          {!lesson.hasEnglish && (
            <p className="mt-3 text-sm text-slate-400">
              Одоогоор MN transcript унших, өгүүлбэр хадгалах боломжтой. EN үг сонгохын тулд жинхэнэ
              English VTT импортлоно. Монгол хадмалыг буцааж орчуулаад original EN гэж нэрлэхгүй.
            </p>
          )}
        </div>
      )}
      {active.length > 0 && (
        <div
          aria-label="Movie current subtitle"
          className="rounded-xl border border-white/10 bg-slate-900 p-4"
        >
          {active.map((cue) => (
            <div key={cue.id}>
              <p lang={cue.language ?? 'en'} className="leading-7 text-amber-100">
                {cue.text}
              </p>
              {cue.translation && (
                <p lang="mn" className="mt-2 text-sm text-slate-400">
                  {cue.translation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
