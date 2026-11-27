'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { decodeProgress, STORAGE_KEY } from '@/lib/learning/storage';
import { mergeLearningSnapshots } from '@/lib/learning/merge';
import {
  emptySnapshot,
  envelopeSchema,
  snapshotKey,
  snapshotSchema,
  type LearningSnapshot,
} from '@/lib/learning/snapshot';

type Account = {
  loaded: boolean;
  scope: string;
  snapshot: LearningSnapshot;
  error: string;
  sync: string;
  writable: boolean;
  merge: () => Promise<void>;
  update: (change: (snapshot: LearningSnapshot) => LearningSnapshot) => boolean;
};
const Context = createContext<Account | null>(null);
export function LearningAccount({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    loaded: false,
    scope: 'guest',
    snapshot: emptySnapshot(),
    error: '',
    sync: '',
    writable: false,
  });
  const current = useRef({
    scope: 'guest',
    snapshot: emptySnapshot(),
    revision: 0,
    dirty: false,
    writable: false,
  });
  const syncing = useRef(false);
  useEffect(() => {
    let stopped = false;
    let generation = 0;
    async function load() {
      const sequence = ++generation;
      let scope = 'guest';
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (response.ok)
          scope = z.object({ me: z.object({ id: z.string() }) }).parse(await response.json()).me.id;
        else if (response.status !== 401) throw new Error();
      } catch {
        if (!stopped && sequence === generation)
          setState((value) => ({
            ...value,
            sync: 'Бүртгэлийн холболт тасарсан. Дахин ачаалаад үзээрэй.',
          }));
        return;
      }
      if (stopped || sequence !== generation) return;
      try {
        const raw = localStorage.getItem(snapshotKey(scope));
        const local = raw
          ? envelopeSchema.parse(JSON.parse(raw))
          : { snapshot: emptySnapshot(), revision: 0, dirty: false };
        if (!raw && scope === 'guest')
          local.snapshot.progress = decodeProgress(localStorage.getItem(STORAGE_KEY));
        current.current = { scope, ...local, writable: true };
        setState({
          loaded: true,
          scope,
          snapshot: local.snapshot,
          error: '',
          writable: true,
          sync:
            scope === 'guest'
              ? 'Энэ хөтөчид хадгална. Нэвтэрвэл тусдаа бүртгэлдээ ахицаа хадгална.'
              : '',
        });
        if (scope === 'guest') return;
        const response = await fetch('/api/learning/state', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const remote = z
          .object({ revision: z.number().int().nonnegative(), snapshot: snapshotSchema })
          .parse(await response.json());
        if (stopped || sequence !== generation) return;
        if (current.current.dirty && current.current.revision !== remote.revision) {
          setState((value) => ({
            ...value,
            sync: 'Өөр төхөөрөмжийн өөрчлөлт байна. Энэ хөтчийн ахиц хадгалагдсан; серверийн хувилбарыг дарж бичээгүй.',
          }));
          return;
        }
        if (!current.current.dirty) {
          current.current = { scope, ...remote, dirty: false, writable: true };
          localStorage.setItem(snapshotKey(scope), JSON.stringify(current.current));
          setState((value) => ({
            ...value,
            snapshot: remote.snapshot,
            sync: 'Бүртгэлтэй синк хийгдлээ.',
          }));
        }
      } catch {
        if (!stopped && sequence === generation)
          setState((value) => ({
            ...value,
            loaded: true,
            writable: current.current.writable,
            error: current.current.writable
              ? ''
              : 'Browser storage уншиж чадсангүй. Өмнөх өгөгдлийг өөрчлөөгүй.',
            sync: 'Сервертэй холбогдсонгүй. Энэ хөтөчид хадгалсан ахиц хэвээр байна.',
          }));
      }
    }
    const refresh = () => {
      current.current.writable = false;
      setState((value) => ({
        ...value,
        loaded: false,
        writable: false,
        snapshot: emptySnapshot(),
      }));
      void load();
    };
    const changed = (event: StorageEvent) => {
      if (event.key !== snapshotKey(current.current.scope)) return;
      try {
        if (!event.newValue) return;
        const next = envelopeSchema.parse(JSON.parse(event.newValue));
        current.current = { ...current.current, ...next };
        setState((value) => ({ ...value, snapshot: next.snapshot }));
      } catch {
        setState((value) => ({
          ...value,
          error: 'Өөр табын хадгалсан өгөгдөл буруу байна. Одоогийн ахицыг хэвээр үлдээлээ.',
        }));
      }
    };
    void load();
    window.addEventListener('vxnta:session-change', refresh);
    window.addEventListener('storage', changed);
    return () => {
      stopped = true;
      window.removeEventListener('vxnta:session-change', refresh);
      window.removeEventListener('storage', changed);
    };
  }, []);
  useEffect(() => {
    if (!state.loaded || state.scope === 'guest') return;
    let stopped = false;
    const sync = async () => {
      if (syncing.current || !current.current.dirty) return;
      const sent = { ...current.current };
      syncing.current = true;
      try {
        const response = await fetch('/api/learning/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revision: sent.revision, snapshot: sent.snapshot }),
        });
        if (!response.ok) throw new Error(response.status === 409 ? 'CONFLICT' : 'OFFLINE');
        const data = z
          .object({ revision: z.number().int().positive() })
          .parse(await response.json());
        if (stopped) return;
        current.current.revision = data.revision;
        current.current.dirty = sent.snapshot !== current.current.snapshot;
        localStorage.setItem(snapshotKey(sent.scope), JSON.stringify(current.current));
        setState((value) => ({ ...value, sync: 'Бүртгэлтэй синк хийгдлээ.' }));
      } catch (cause) {
        if (!stopped)
          setState((value) => ({
            ...value,
            sync:
              cause instanceof Error && cause.message === 'CONFLICT'
                ? 'Өөр төхөөрөмжийн өөрчлөлт байна. Энэ хөтчийн ахицыг хадгалсан, серверийн өгөгдлийг дарж бичээгүй.'
                : 'Ахиц энэ хөтөчид хадгалагдсан. Холболт сэргэхэд сервер рүү дахин илгээнэ.',
          }));
      } finally {
        syncing.current = false;
      }
    };
    let timer = setTimeout(() => {
      void sync();
    }, 700);
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void sync();
      }, 700);
    };
    const interval = setInterval(() => {
      void sync();
    }, 30_000);
    window.addEventListener('online', sync);
    window.addEventListener('vxnta:learning-dirty', changed);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('online', sync);
      window.removeEventListener('vxnta:learning-dirty', changed);
    };
  }, [state.loaded, state.scope]);
  function update(change: (snapshot: LearningSnapshot) => LearningSnapshot) {
    if (!current.current.writable) return false;
    try {
      const raw = localStorage.getItem(snapshotKey(current.current.scope));
      if (raw) envelopeSchema.parse(JSON.parse(raw));
      else if (current.current.scope === 'guest') decodeProgress(localStorage.getItem(STORAGE_KEY));
      const snapshot = snapshotSchema.parse(change(current.current.snapshot));
      const next = { ...current.current, snapshot, dirty: true };
      localStorage.setItem(snapshotKey(next.scope), JSON.stringify(next));
      if (next.scope === 'guest') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.progress));
        } catch {
          /* The versioned snapshot is already saved. */
        }
      }
      current.current = next;
      setState((value) => ({ ...value, snapshot, error: '' }));
      window.dispatchEvent(new Event('vxnta:learning-dirty'));
      return true;
    } catch {
      setState((value) => ({
        ...value,
        error:
          'Хадгалж чадсангүй. Хөтчийн storage дүүрсэн, хаалттай эсвэл өгөгдөл гэмтсэн байна. Өмнөх ахицыг устгаагүй.',
      }));
      return false;
    }
  }
  async function merge() {
    if (current.current.scope === 'guest' || syncing.current) return;
    const scope = current.current.scope;
    try {
      const response = await fetch('/api/learning/state', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const remote = z
        .object({ revision: z.number().int().nonnegative(), snapshot: snapshotSchema })
        .parse(await response.json());
      if (current.current.scope !== scope) return;
      const snapshot = mergeLearningSnapshots(current.current.snapshot, remote.snapshot);
      const next = { ...current.current, snapshot, revision: remote.revision, dirty: true };
      localStorage.setItem(snapshotKey(scope), JSON.stringify(next));
      current.current = next;
      setState((value) => ({
        ...value,
        snapshot,
        error: '',
        sync: 'Хоёр төхөөрөмжийн хадгалсан үг, тестийн түүхийг нэгтгэлээ. Серверт хадгалж байна…',
      }));
      window.dispatchEvent(new Event('vxnta:learning-dirty'));
    } catch {
      setState((value) => ({
        ...value,
        error:
          'Нэгтгэж чадсангүй. Хадгалсан ахицыг хэвээр үлдээлээ. Холболт болон 500 картын хязгаарыг шалгаарай.',
      }));
    }
  }
  return <Context.Provider value={{ ...state, update, merge }}>{children}</Context.Provider>;
}
export function useLearningAccount() {
  const account = useContext(Context);
  if (!account) throw new Error('LearningAccount is required');
  return account;
}
