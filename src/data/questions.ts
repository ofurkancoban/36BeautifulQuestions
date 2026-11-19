// The 36 questions from Aron, Melinat, Aron, Vallone & Bator (1997),
// "The Experimental Generation of Interpersonal Closeness: A Procedure and Some Preliminary Findings",
// Personality and Social Psychology Bulletin, 23(4), 363-377.
// Wording follows the widely published list; question 27 and 36 use gender-neutral "them".

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

export const SETS: QuestionSet[] = [
  {
    id: 1,
    numeral: 'I',
    name: 'Dusk',
    mood: 'dusk',
    tagline: 'Getting to know each other',
    intro: 'Twelve gentle questions to warm the room. Curiosity first, depth later.',
  },
  {
    id: 2,
    numeral: 'II',
    name: 'Twilight',
    mood: 'twilight',
    tagline: 'Going a little deeper',
    intro: 'Memories, dreams and the people who shaped you. Take your time with these.',
  },
  {
    id: 3,
    numeral: 'III',
    name: 'Midnight',
    mood: 'midnight',
    tagline: 'Letting each other in',
    intro: 'The most open of the three. Speak honestly, listen generously.',
  },
];

const RAW: Array<[string, string?, number?]> = [
  // Set I
  ['Given the choice of anyone in the world, whom would you want as a dinner guest?'],
  ['Would you like to be famous? In what way?'],
  ['Before making a telephone call, do you ever rehearse what you are going to say? Why?'],
  ['What would constitute a “perfect” day for you?'],
  ['When did you last sing to yourself? To someone else?'],
  [
    'If you were able to live to the age of 90 and retain either the mind or body of a 30-year-old for the last 60 years of your life, which would you want?',
  ],
  ['Do you have a secret hunch about how you will die?'],
  ['Name three things you and your partner appear to have in common.'],
  ['For what in your life do you feel most grateful?'],
  ['If you could change anything about the way you were raised, what would it be?'],
  [
    'Take four minutes and tell your partner your life story in as much detail as possible.',
    'Four minutes each. Start the timer whenever the storyteller is ready.',
    240,
  ],
  ['If you could wake up tomorrow having gained any one quality or ability, what would it be?'],
  // Set II
  [
    'If a crystal ball could tell you the truth about yourself, your life, the future or anything else, what would you want to know?',
  ],
  ['Is there something that you’ve dreamed of doing for a long time? Why haven’t you done it?'],
  ['What is the greatest accomplishment of your life?'],
  ['What do you value most in a friendship?'],
  ['What is your most treasured memory?'],
  ['What is your most terrible memory?', 'Share only what feels safe tonight.'],
  [
    'If you knew that in one year you would die suddenly, would you change anything about the way you are now living? Why?',
  ],
  ['What does friendship mean to you?'],
  ['What roles do love and affection play in your life?'],
  [
    'Alternate sharing something you consider a positive characteristic of your partner. Share a total of five items.',
    'Go back and forth, one quality at a time.',
  ],
  [
    'How close and warm is your family? Do you feel your childhood was happier than most other people’s?',
  ],
  ['How do you feel about your relationship with your mother?'],
  // Set III
  [
    'Make three true “we” statements each. For instance, “We are both in this room feeling…”',
    'Take turns, one statement at a time.',
  ],
  ['Complete this sentence: “I wish I had someone with whom I could share…”'],
  [
    'If you were going to become a close friend with your partner, please share what would be important for them to know.',
  ],
  [
    'Tell your partner what you like about them; be very honest this time, saying things that you might not say to someone you’ve just met.',
  ],
  ['Share with your partner an embarrassing moment in your life.'],
  ['When did you last cry in front of another person? By yourself?'],
  ['Tell your partner something that you like about them already.'],
  ['What, if anything, is too serious to be joked about?'],
  [
    'If you were to die this evening with no opportunity to communicate with anyone, what would you most regret not having told someone? Why haven’t you told them yet?',
  ],
  [
    'Your house, containing everything you own, catches fire. After saving your loved ones and pets, you have time to safely make a final dash to save any one item. What would it be? Why?',
  ],
  ['Of all the people in your family, whose death would you find most disturbing? Why?'],
  [
    'Share a personal problem and ask your partner’s advice on how they might handle it. Also, ask your partner to reflect back to you how you seem to be feeling about the problem you have chosen.',
  ],
];

export const QUESTIONS: Question[] = RAW.map(([text, hint, timerSeconds], i) => ({
  n: i + 1,
  set: (Math.floor(i / 12) + 1) as 1 | 2 | 3,
  text,
  hint,
  timerSeconds,
}));

export const TOTAL = QUESTIONS.length;
export const PER_SET = 12;
export const CLASSIC_SET_MINUTES = 15;

export function setOf(qIndex: number): QuestionSet {
  return SETS[Math.min(2, Math.floor(qIndex / PER_SET))];
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
