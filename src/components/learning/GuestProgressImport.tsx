'use client';
import { useState } from 'react';
import { envelopeSchema, snapshotKey, type LearningSnapshot } from '@/lib/learning/snapshot';
import { mergeLearningSnapshots } from '@/lib/learning/merge';
import { useLearningAccount } from './LearningAccount';

export default function GuestProgressImport() {
  const account = useLearningAccount();
  const [preview, setPreview] = useState<LearningSnapshot | null>(null);
  const [message, setMessage] = useState('');
  if (!account.loaded || account.scope === 'guest') return null;
  return (
    <details className="mt-4 rounded-xl border border-white/10 p-4 text-sm">
      <summary className="w-fit cursor-pointer text-slate-300">
        Нэвтрэхээс өмнө хийсэн дасгалаа нэмэх
      </summary>
      <p className="mt-3 leading-6 text-slate-400">
        Энэ төхөөрөмж дээр зочноор хийсэн дасгал таных бол бүртгэлдээ нэгтгэж болно. Нийтийн
        төхөөрөмж бол эхлээд мэдээллийг нь шалгаарай.
      </p>
      {!preview ? (
        <button
          type="button"
          className="mt-3 text-amber-200 underline"
          onClick={() => {
            try {
              const raw = localStorage.getItem(snapshotKey('guest'));
              if (!raw) {
                setMessage('Энэ төхөөрөмжид зочны дасгал алга.');
                return;
              }
              setPreview(envelopeSchema.parse(JSON.parse(raw)).snapshot);
              setMessage('');
            } catch {
              setMessage('Зочны дасгалыг уншиж чадсангүй. Хуучин өгөгдлийг хэвээр үлдээлээ.');
            }
          }}
        >
          Зочны дасгалыг шалгах
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-slate-300">
            {preview.progress.items.length} карт · {preview.assessments.length} түвшний тест ·{' '}
            {preview.activity.filter((event) => event.kind === 'review').length} давталт
          </p>
          <button
            type="button"
            disabled={!account.writable}
            className="rounded-lg bg-[#c9a227] px-4 py-2 font-semibold text-slate-950 disabled:opacity-40"
            onClick={() => {
              if (account.update((snapshot) => mergeLearningSnapshots(snapshot, preview))) {
                setPreview(null);
                setMessage(
                  'Зочны дасгалыг бүртгэлдээ нэгтгэлээ. Давхардсан карт, давталтыг дахин нэмээгүй.',
                );
              }
            }}
          >
            Миний дасгал мөн — нэгтгэх
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-slate-300">
          {message}
        </p>
      )}
    </details>
  );
}
