'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const LearningDock = dynamic(() => import('@/components/learning/LearningDock'), {
  ssr: false,
  loading: () => (
    <p role="status" className="py-6 text-slate-400">
      Хичээл ачаалж байна…
    </p>
  ),
});

export default function LearnPage() {
  const [source, setSource] = useState('sample');
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm font-semibold text-[#c9a227]">VXNTA · Англи хэл</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
          Нэг өгүүлбэрээс эхэлье.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">
          Сонсоод, мэдэхгүй үгээ дараад, утгыг нь тогтоо. Эхний хичээлд бүртгэл хэрэггүй.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
          <span>38 секундийн видео</span>
          <span>Англи + Монгол хадмал</span>
          <span>Өөрийн хурдаар</span>
        </div>
        <LearningDock
          movieId="scenechain-intro"
          movieTitle="The Last Train · Сургалтын жишээ"
          source={source}
          onSource={setSource}
          intro
        />
        <Link
          href="/movies"
          className="inline-flex rounded-lg border border-white/15 px-4 py-3 text-sm text-amber-200"
        >
          Одоо кино сонгоё →
        </Link>
      </div>
      <Footer />
    </main>
  );
}
