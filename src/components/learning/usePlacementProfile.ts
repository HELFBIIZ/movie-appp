'use client';
import { useEffect, useState } from 'react';
import {
  assessPlacement,
  decodePlacement,
  persistPlacement,
  PLACEMENT_KEY,
  PLACEMENT_EVENT,
  type PlacementAnswers,
  type PlacementProfile,
} from '@/lib/learning/placement';

let temporary: { profile: PlacementProfile; error: string } | null = null;
export function usePlacementProfile() {
  const [state, setState] = useState<{
    loaded: boolean;
    profile: PlacementProfile | null;
    error: string;
  }>({ loaded: false, profile: null, error: '' });
  useEffect(() => {
    const read = () => {
      if (temporary) {
        setState({ ...temporary, loaded: true });
        return;
      }
      try {
        setState({
          loaded: true,
          profile: decodePlacement(localStorage.getItem(PLACEMENT_KEY)),
          error: '',
        });
      } catch {
        setState({
          loaded: true,
          profile: null,
          error: 'Өмнөх түвшний мэдээллийг уншиж чадсангүй. Дахин тест хийж болно.',
        });
      }
    };
    const changed = (event: StorageEvent) => {
      if (event.key === PLACEMENT_KEY || event.key === null) {
        temporary = null;
        read();
      }
    };
    read();
    window.addEventListener(PLACEMENT_EVENT, read);
    window.addEventListener('storage', changed);
    return () => {
      window.removeEventListener(PLACEMENT_EVENT, read);
      window.removeEventListener('storage', changed);
    };
  }, []);
  function save(answers: PlacementAnswers) {
    const completedAt = Date.now();
    const profile = assessPlacement(answers, completedAt);
    let error = '';
    try {
      persistPlacement(localStorage, answers, completedAt);
    } catch {
      error = 'Түвшин энэ удаад тооцогдсон ч хөтөчид хадгалагдсангүй. Шинэчилбэл дахин тест хийнэ.';
    }
    temporary = { profile, error };
    window.dispatchEvent(new Event(PLACEMENT_EVENT));
    return temporary;
  }
  return { ...state, save };
}
