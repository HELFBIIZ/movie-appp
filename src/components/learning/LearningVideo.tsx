'use client';
import { useEffect, useState, type RefObject } from 'react';

export default function LearningVideo({
  url,
  videoRef,
  onTime,
  onReady,
}: {
  url: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onTime: (time: number) => void;
  onReady: () => void;
}) {
  const [error, setError] = useState(false);
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 1) onReady();
  }, [url, videoRef, onReady]);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label="Өөрийн видео"
        className="aspect-video w-full"
        onTimeUpdate={(event) => onTime(event.currentTarget.currentTime)}
        onSeeked={(event) => onTime(event.currentTarget.currentTime)}
        onLoadedMetadata={onReady}
        onCanPlay={onReady}
        onError={() => setError(true)}
      />
      {error && (
        <p role="alert" className="p-4 text-sm text-rose-300">
          Видеог нээж чадсангүй. Өөр файл сонгоорой.
        </p>
      )}
    </div>
  );
}
