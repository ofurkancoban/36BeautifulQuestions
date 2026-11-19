import { useMemo } from 'react';
import { questionsFor, setsFor } from '../data/questions';
import { useT } from './index';

/** Localized questions and sets, memoized per language. */
export function useContent() {
  const m = useT();
  return useMemo(() => ({ m, questions: questionsFor(m), sets: setsFor(m) }), [m]);
}
