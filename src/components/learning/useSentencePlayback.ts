'use client';
import { useEffect, useRef, useState } from 'react';
import type { AlignedCue } from '@/lib/learning/types';
import type { LearningController, LearningSource } from './useLearningController';

export function useSentencePlayback(controller: LearningController, source: LearningSource) {
  const [loop, setLoop] = useState(false);
  const [slow, setSlow] = useState(false);
  const range = useRef<{ start: number; end: number; loop: boolean } | null>(null);
  const { videoRef, moviePlayer, setMessage } = controller;
  const cancelReplay = moviePlayer.cancelReplay;
  useEffect(() => () => cancelReplay(), [cancelReplay]);
  useEffect(() => {
    const video = videoRef.current;
    if (source !== 'local' || !video) return;
    const tick = () => {
      const current = range.current;
      if (!current || video.currentTime < current.end) return;
      if (current.loop) video.currentTime = current.start;
      else {
        video.pause();
        range.current = null;
      }
    };
    const cancel = () => {
      range.current = null;
    };
    video.addEventListener('timeupdate', tick);
    video.addEventListener('pause', cancel);
    return () => {
      video.removeEventListener('timeupdate', tick);
      video.removeEventListener('pause', cancel);
      if (range.current) video.pause();
      range.current = null;
      video.playbackRate = 1;
    };
  }, [source, videoRef, controller.lesson.videoUrl]);
  function stop() {
    range.current = null;
    if (source === 'movie') moviePlayer.pause();
    else videoRef.current?.pause();
  }
  async function listen(cue: AlignedCue) {
    if (source === 'movie') {
      if (!moviePlayer.replay(cue.start, cue.end, loop))
        setMessage('Киногоо тоглуулаад дахин сонсоорой.');
      return;
    }
    const video = videoRef.current;
    if (!video || !controller.ready) return;
    try {
      video.currentTime = cue.start;
      video.playbackRate = slow ? 0.75 : 1;
      range.current = { start: cue.start, end: cue.end, loop };
      await video.play();
    } catch {
      range.current = null;
      setMessage('Видео дээр тоглуулах товчийг дарна уу.');
    }
  }
  return {
    loop,
    slow,
    listen,
    stop,
    follow: () => {
      range.current = null;
      cancelReplay();
    },
    changeLoop: (value: boolean) => {
      setLoop(value);
      if (range.current) range.current.loop = value;
      if (source === 'movie') cancelReplay();
    },
    changeSlow: (value: boolean) => {
      setSlow(value);
      if (videoRef.current) videoRef.current.playbackRate = value ? 0.75 : 1;
    },
  };
}
