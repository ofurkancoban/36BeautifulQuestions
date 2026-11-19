// The 36 questions from Aron, Melinat, Aron, Vallone & Bator (1997),
// "The Experimental Generation of Interpersonal Closeness: A Procedure and Some Preliminary Findings",
// Personality and Social Psychology Bulletin, 23(4), 363-377.
// The text of every question lives in src/i18n/<lang>.ts; this file holds the structure.

import en, { type Messages } from '../i18n/en';

export type Mood = 'night' | 'dusk' | 'twilight' | 'midnight' | 'dawn';

export interface QuestionSet {
  id: 1 | 2 | 3;
  numeral: 'I' | 'II' | 'III';
  name: string;
  mood: Mood;
  tagline: string;
  intro: string;
}

export interface Question {
  n: number; // 1-based
  set: 1 | 2 | 3;
  text: string;
  hint?: string;
  timerSeconds?: number; // optional per-question timer offered in the UI
}

const MOODS: Mood[] = ['dusk', 'twilight', 'midnight'];
const NUMERALS = ['I', 'II', 'III'] as const;

/** Sets with their text in the given language (English by default). */
export function setsFor(m: Messages = en): QuestionSet[] {
  return m.sets.map((s, i) => ({
    id: (i + 1) as 1 | 2 | 3,
    numeral: NUMERALS[i],
    mood: MOODS[i],
    ...s,
  }));
}

// Per-question timers are structural and shared by every language.
const TIMERS: Record<number, number> = { 11: 240 };

/** Questions with their text in the given language (English by default). */
export function questionsFor(m: Messages = en): Question[] {
  return m.questions.map((q, i) => ({
    n: i + 1,
    set: (Math.floor(i / 12) + 1) as 1 | 2 | 3,
    text: q.text,
    hint: q.hint,
    timerSeconds: TIMERS[i + 1],
  }));
}

export const SETS = setsFor();
export const QUESTIONS = questionsFor();

export const TOTAL = QUESTIONS.length;
export const PER_SET = 12;
export const CLASSIC_SET_MINUTES = 15;

export function setIndex(qIndex: number): number {
  return Math.min(2, Math.floor(qIndex / PER_SET));
}

export function setOf(qIndex: number, sets: QuestionSet[] = SETS): QuestionSet {
  return sets[setIndex(qIndex)];
}

const ROMAN: Array<[number, string]> = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function roman(n: number): string {
  let out = '';
  for (const [v, s] of ROMAN) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

export const STUDY = {
  citation:
    'Aron, A., Melinat, E., Aron, E. N., Vallone, R. D., & Bator, R. J. (1997). The experimental generation of interpersonal closeness: A procedure and some preliminary findings. Personality and Social Psychology Bulletin, 23(4), 363–377.',
  doi: 'https://doi.org/10.1177/0146167297234003',
  essay: 'https://www.nytimes.com/2015/01/11/style/modern-love-to-fall-in-love-with-anyone-do-this.html',
};
