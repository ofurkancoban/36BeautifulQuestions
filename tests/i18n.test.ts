import { describe, expect, it } from 'vitest';
import { LANGS, MESSAGES, isLang } from '../src/i18n';
import { questionsFor, setsFor } from '../src/data/questions';

const en = MESSAGES.en;

/** Collects every string a message table produces, calling functions with sample arguments. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (typeof value === 'function') {
    for (const args of [['Ada', 'Deniz'], [1, 1], [36, 45], [2, null], [5, 3]]) {
      try {
        strings((value as (...a: unknown[]) => unknown)(...args), out);
      } catch {
        // Some functions expect other argument shapes; the samples above cover each at least once.
      }
    }
  } else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  return typeof value;
}

describe('i18n', () => {
  it('offers the eight requested languages', () => {
    expect(LANGS).toEqual(['en', 'tr', 'de', 'nl', 'fr', 'it', 'es', 'ru']);
    expect(isLang('tr')).toBe(true);
    expect(isLang('xx')).toBe(false);
  });

  for (const lang of LANGS) {
    describe(lang, () => {
      const m = MESSAGES[lang];

      it('has the same keys and list lengths as English', () => {
        const { meta: _a, ...rest } = m;
        const { meta: _b, ...restEn } = en;
        expect(shape(rest)).toEqual(shape(restEn));
        expect(m.meta.code).toBe(lang);
      });

      it('translates all 36 questions with hints in the same places', () => {
        const qs = questionsFor(m);
        expect(qs).toHaveLength(36);
        qs.forEach((q, i) => {
          expect(q.text.trim().length).toBeGreaterThan(10);
          expect(!!q.hint).toBe(!!en.questions[i].hint);
        });
        expect(qs[10].timerSeconds).toBe(240);
        expect(setsFor(m).map((s) => s.numeral)).toEqual(['I', 'II', 'III']);
      });

      it('has no empty strings and no em dashes', () => {
        for (const s of strings(m)) {
          expect(s.trim().length).toBeGreaterThan(0);
          expect(s).not.toContain('\u2014');
        }
      });

      it('formats counts and durations', () => {
        expect(m.finale.line(36, 45)).toMatch(/45/);
        expect(m.finale.line(1, null)).not.toMatch(/null/);
        expect(m.keepsake.when('1 May 2026', null)).not.toMatch(/null/);
      });
    });
  }

  if (LANGS.length > 1) {
    it('actually translates the questions', () => {
      for (const lang of LANGS.filter((l) => l !== 'en')) {
        expect(MESSAGES[lang].questions[0].text).not.toBe(en.questions[0].text);
      }
    });
  }
});
