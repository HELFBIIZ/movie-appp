'use client';

import { useEffect, useState } from 'react';
import { decodeProgress, persistProgress, STORAGE_KEY } from '@/lib/learning/storage';
import type { Progress } from '@/lib/learning/types';

export function useLearningStorage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    const read = () => {
      try {
        setProgress(decodeProgress(window.localStorage.getItem(STORAGE_KEY)));
        setStorageError('');
      } catch {
        setProgress(null);
        setStorageError(
          'Browser storage уншиж чадсангүй. Хадгалсан өгөгдлийг өөрчлөөгүй. Browser-ийн storage зөвшөөрлийг шалгана уу.',
        );
      }
    };
    read();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) read();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function update(change: (current: Progress) => Progress): boolean {
    try {
      const current = decodeProgress(window.localStorage.getItem(STORAGE_KEY));
      const next = change(current);
      persistProgress(window.localStorage, next);
      setProgress(next);
      setStorageError('');
      return true;
    } catch {
      setStorageError(
        'Хадгалж чадсангүй. Storage дүүрсэн, хаалттай эсвэл картын хязгаарт хүрсэн байж болно. Өөрчлөлтийг хадгалсан гэж тооцоогүй.',
      );
      return false;
    }
  }
  return { progress, storageError, update };
}
