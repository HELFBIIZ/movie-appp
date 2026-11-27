'use client';
import { useEffect, useState } from 'react';
import { watchAccessSchema } from '@/lib/contracts';
import type { WatchGate } from '@/types/api';

export function useWatchAccess(slug: string): WatchGate {
  const [observed, setObserved] = useState<{ slug: string; gate: WatchGate }>({
    slug: '',
    gate: { status: 'loading' },
  });
  useEffect(() => {
    let cancelled = false;
    const setGate = (gate: WatchGate) => setObserved({ slug, gate });
    fetch(`/api/watch/${slug}`, { method: 'POST' })
      .then((res) =>
        res.json().then((body: unknown) => ({ res, data: watchAccessSchema.parse(body) })),
      )
      .then(({ res, data }) => {
        if (cancelled) return;
        if (res.ok && data.allowed)
          setGate({ status: 'allowed', player: data.player, xp: data.xp });
        else
          setGate({
            status: 'blocked',
            code: data.error?.code ?? 'BLOCKED',
            statusCode: res.status,
          });
      })
      .catch(() => !cancelled && setGate({ status: 'blocked', code: 'NETWORK' }));
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return observed.slug === slug ? observed.gate : { status: 'loading' };
}
