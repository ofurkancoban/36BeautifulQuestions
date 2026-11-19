import { useCallback, useState } from 'react';
import { QUESTIONS } from '../data/questions';

/**
 * Private notes: written on this device, kept only in this device's storage, never sent to the partner.
 */

const KEY = (code: string) => `b36q:notes:${code}`;

export type Notes = Record<number, string>;

function read(code: string): Notes {
  try {
    const raw = localStorage.getItem(KEY(code));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Notes = {};
    for (const [k, v] of Object.entries(parsed)) {
      const n = Number(k);
      if (Number.isInteger(n) && n >= 0 && n < QUESTIONS.length && typeof v === 'string') out[n] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function write(code: string, notes: Notes) {
  try {
    localStorage.setItem(KEY(code), JSON.stringify(notes));
  } catch {
    /* storage unavailable; notes live for this visit only */
  }
}

export function useNotes(code: string) {
  const [notes, setNotes] = useState<Notes>(() => read(code));
  const setNote = useCallback(
    (q: number, text: string) => {
      setNotes((prev) => {
        const next = { ...prev };
        if (text.trim()) next[q] = text.slice(0, 4000);
        else delete next[q];
        write(code, next);
        return next;
      });
    },
    [code],
  );
  return { notes, setNote };
}

export function notesAsText(notes: Notes, names: string, date: string) {
  const lines = [`36 Beautiful Questions`, `${names}, ${date}`, ''];
  for (const q of QUESTIONS) {
    const text = notes[q.n - 1];
    if (!text) continue;
    lines.push(`${q.n}. ${q.text}`, '', text.trim(), '', '');
  }
  return lines.join('\n');
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
