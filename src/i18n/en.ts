// English source strings. Every other language implements the same shape (see `Messages`).

export interface QuestionText {
  text: string;
  hint?: string;
}

export interface SetText {
  name: string;
  tagline: string;
  intro: string;
}

const en = {
  meta: { code: 'en', name: 'English', locale: 'en-US' },

  common: {
    appName: '36 Beautiful Questions',
    back: 'Back',
    you: 'You',
    me: 'Me',
    partner: 'Partner',
    close: 'Close',
    language: 'Language',
  },

  errors: {
    notFound: 'We couldn’t find a ritual with that code. Ask your partner to keep their invitation open.',
    full: 'This ritual already has two people in it.',
    otherTab: 'This ritual seems to be open in another tab or device.',
    incompatible: 'This browser cannot open a direct connection. Try a recent Chrome, Safari or Firefox.',
    loadFailed: 'Could not load the connection library. Check your internet connection.',
  },

  landing: {
    lede: 'A ritual for two. Three sets, thirty-six questions, one evening of letting someone in.',
    offline: 'You are offline. Playing together on one phone still works.',
    resume: 'Return to your ritual',
    resumeLocal: (a: string, b: string) => `Return to ${a} & ${b}`,
    begin: 'Begin a ritual',
    haveInvite: 'I have an invitation',
    onePhone: 'Or play together on one phone',
    how: 'How it works, and the science behind it',
    nameQuestion: 'What should they call you?',
    namePlaceholder: 'Your name',
    createInvite: 'Create an invitation',
    invited: 'You’ve been invited.',
    inviteCode: 'Invitation code',
    codeAria: 'Six letter invitation code',
    join: 'Join your person',
    localIntro: 'One phone between you, passed back and forth. No connection needed.',
    localYourName: 'Your name',
    localTheirName: 'And theirs',
    localFirst: 'First person',
    localSecond: 'Second person',
    localBegin: 'Begin on this phone',
    footer: 'After Aron, Melinat, Aron, Vallone & Bator, 1997',
  },

  session: {
    finding: 'Finding your person',
    invitation: 'Invitation',
    cancel: 'Cancel',
    onePhone: 'one phone',
    withName: (n: string) => `with ${n}`,
    away: (n: string) => `${n} stepped away`,
    connecting: 'connecting',
    awaiting: 'awaiting',
    awayBanner: (n: string) => `Waiting for ${n} to reconnect. Everything is saved.`,
  },

  menu: {
    title: 'Menu',
    sound: 'Sound cues',
    music: 'Ambient music',
    invitation: 'Invitation',
    linkCopied: 'link copied',
    how: 'How it works',
    pass: 'Pass this question',
    passConfirm: 'Tap again to pass this question',
    nextSet: 'Move to the next set',
    closing: 'Go to the closing',
    moveConfirm: 'Tap again to move on',
    leave: 'Leave the ritual',
    leaveConfirm: 'Tap again to leave',
  },

  lobby: {
    invite: 'Invite your person',
    waitingReturn: (n: string) => `Waiting for ${n} to return`,
    findingSub: 'Opening a quiet line between your screens',
    yourInvitation: 'Your invitation',
    codeAria: (c: string) => `Invitation code ${c}, tap to copy`,
    codeCopied: 'Code copied',
    shareHint: 'Share the code, the link, or let them scan',
    qrAria: 'QR code for the invitation link',
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
    share: 'Share',
    shareText: 'Come answer thirty-six questions with me.',
    pacing: 'Pacing',
    classic: 'Classic · 45 min',
    unhurried: 'Unhurried',
    classicNote: 'Fifteen minutes per set, as in the original study.',
    unhurriedNote: 'No clock. Stay with each question as long as you like.',
    firstCard: 'Who holds the first card',
    fate: 'Let fate decide',
    fateDeciding: 'Fate is deciding',
    seating: 'How you sit',
    across: 'Across the table',
    side: 'Side by side',
    acrossNote: (a: string, b: string) => `Lay the phone facing ${a}. On ${b}’s turns the whole screen turns around.`,
    sideNote: 'The screen always faces the same way.',
    ready: 'I’m ready',
    beginLocal: 'Begin the ritual',
  },

  ready: {
    waitingFor: (n: string) => `Waiting for ${n}`,
    hint: 'Tap again if you need another moment.',
  },

  prelude: {
    eyebrow: 'Before you begin',
    title: 'Three small promises',
    rules: [
      { title: 'Take turns holding the card', body: 'Whoever holds it turns it over, reads it aloud, and answers first.' },
      { title: 'Both of you answer', body: 'Every question, every time. Closeness grows from giving and receiving in turn.' },
      { title: 'Be honest, be gentle', body: 'There are no wrong answers. Listen fully. Pause when you need to.' },
    ],
    promise: 'I promise',
    promiseLocal: 'We promise',
  },

  setIntro: {
    of: (n: string) => `Set ${n} of III`,
    classicNote: 'About fifteen minutes. The clock starts with the first card.',
    draw: 'Draw the first card',
  },

  question: {
    set: 'Set',
    no: 'No.',
    of: 'of 36',
    progressAria: (n: number) => `Question ${n} of 36`,
    noteWrite: 'Write a private note',
    noteEdit: 'Edit your private note',
    noteTitle: 'A private note',
    notePlaceholder: 'What do you want to remember about this moment?',
    notePrivacy: (partner: string | null) =>
      partner ? `Kept only on this device. Never sent to ${partner}.` : 'Kept only on this phone. Never sent anywhere.',
    noteLater: 'You can read all your notes at the end.',
    youHold: 'You hold the card.',
    holds: (n: string) => `${n} holds the card.`,
    turnOver: 'Turn the card over',
    readFirst: 'Read it aloud, then answer first.',
    answered: 'I’ve answered',
    listenTo: (n: string) => `Now listen to ${n}.`,
    isAnswering: (n: string) => `${n} is answering`,
    listenFirst: (n: string) => `Listen as ${n} answers first.`,
    turnNext: 'Your turn comes next',
    yourTurn: 'Your turn to answer.',
    localRead: (n: string) => `${n}, read it aloud and answer first.`,
    localYourTurn: (n: string) => `${n}, your turn to answer.`,
    localAnswered: (n: string) => `${n} has answered`,
    undo: 'Undo',
    aboutToTurn: (n: string) => `${n} is about to turn the card`,
    revealAria: 'Reveal the card',
    chip: { waiting: 'waiting', speaking: 'speaking', listening: 'listening', done: 'answered' },
    timerStart: 'Start four minutes',
    timerReset: 'Reset timer',
    timeShort: 'Time',
    timeUp: 'Fifteen minutes have passed. In the study, this is where you would move on.',
    moveToSet: (n: string) => `Move to Set ${n}`,
    goClosing: 'Go to the closing',
  },

  interlude: {
    held: 'Twelve questions, held.',
    breathe: (name: string, tagline: string) =>
      `Take a few slow breaths together. When you are both ready, the next set waits: ${name}, ${tagline.toLowerCase()}.`,
    continueTo: (n: string) => `Continue to Set ${n}`,
    breath: { in: 'breathe in', hold: 'hold', out: 'breathe out', rest: 'rest' },
  },

  gaze: {
    eyebrow: 'Thirty-six questions, answered',
    title: 'One last thing, without words',
    body: 'Put the phones down, face up. Look into each other’s eyes for four minutes, in silence. If you are apart, look into the camera on your call. It will feel strange, then it won’t.',
    note: 'Not part of the 1997 study itself. It comes from Mandy Len Catron’s 2015 essay, which made the questions famous.',
    ready: 'We’re ready',
    skip: 'Skip to the end',
    look: 'just look',
    welcome: 'Welcome back',
    lookAt: (n: string) => `Look at ${n}. Nothing else is needed.`,
    lookEach: 'Look at each other. Nothing else is needed.',
    end: 'End here',
  },

  finale: {
    line: (count: number, minutes: number | null) => {
      const words = count === 36 ? 'thirty-six' : String(count);
      const q = count === 1 ? 'question' : 'questions';
      const m = minutes ? `, in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : '';
      return `You asked each other ${words} beautiful ${q}${m}.`;
    },
    closing: 'Whatever happens next, you now know each other a little better than you did an hour ago. That was the whole point.',
    stays: 'The question that stays with you',
    theyChose: (n: string) => `${n} has chosen. Choose yours to see it.`,
    waitingChoice: (n: string) => `Waiting for ${n} to choose.`,
    chooseYours: 'Choose yours',
    changeYours: 'Change your choice',
    localChoice: (n: string) => `${n}’s choice`,
    localChange: (n: string) => `Change ${n}’s choice`,
    pickerYours: 'Your question',
    pickerLocal: (n: string) => `${n}’s question`,
    keep: 'Keep this moment',
    notes: (n: number) => `Your private notes (${n})`,
    again: 'Begin again together',
    againConfirm: 'Tap again to begin anew',
    leave: 'Leave the ritual',
    notesTitle: 'Your private notes',
    download: 'Download as text',
    notesNever: 'These notes never left this device.',
  },

  keepsake: {
    brand: '36 BEAUTIFUL QUESTIONS',
    asked: (count: number) =>
      `asked each other ${count === 36 ? 'thirty-six' : count} ${count === 1 ? 'question' : 'questions'}`,
    when: (date: string, minutes: number | null) =>
      minutes ? `on ${date}, in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.` : `on ${date}.`,
    stayedOne: 'THE QUESTION THAT STAYED',
    stayedMany: 'THE QUESTIONS THAT STAYED',
    no: 'NO.',
    credit: 'After Aron et al., 1997',
  },

  intimacy: {
    heart: 'Send love',
    spark: 'Send wonder',
    laugh: 'Send a laugh',
    tear: 'Send tenderness',
    holdAria: 'Hold to reach for your partner',
    hold: 'hold',
    together: 'Together, for a moment.',
    reaching: (n: string) => `${n} is reaching for you. Hold the heart.`,
  },

  how: {
    title: 'The thirty-six questions',
    intro:
      'In 1997 the psychologist Arthur Aron and his colleagues asked pairs of strangers to spend forty-five minutes trading answers to thirty-six questions. The questions grow steadily more personal across three sets, and the pairs reported feeling remarkably close by the end. The idea is simple: closeness grows through sustained, escalating, reciprocal self-disclosure.',
    playTitle: 'How to play',
    steps: [
      { lead: 'Take turns holding the card.', text: 'Whoever holds it turns it over, reads the question aloud and answers first. Then the other answers. Next question, the card passes.' },
      { lead: 'Both of you answer every question.', text: 'That reciprocity is the heart of the method.' },
      { lead: 'Three sets, about fifteen minutes each.', text: 'In Classic pacing a gentle clock follows the study: when fifteen minutes pass, you are invited to move on even if questions remain. Unhurried pacing has no clock at all.' },
      { lead: 'Close with silence.', text: 'Optionally, end with four minutes of looking into each other’s eyes, a ritual made famous by Mandy Len Catron’s 2015 Modern Love essay.' },
    ],
    togetherTitle: 'Together or apart',
    together:
      'Sit across from each other with a phone each, share one phone, or play over a video call from different cities. Your screens stay in sync directly, device to device. Nothing you say is recorded, and the app never hears your answers. Each of you can choose your own language.',
    gesturesTitle: 'Little gestures',
    gestures:
      'Send a heart, a spark, a laugh or a tear at any moment. Press and hold the heart in the middle: when you both hold it at the same time, your screens glow and beat together.',
    readStudy: 'Read the study',
    readEssay: 'Read the essay',
  },


  sets: [
    { name: 'Dusk', tagline: 'Getting to know each other', intro: 'Twelve gentle questions to warm the room. Curiosity first, depth later.' },
    { name: 'Twilight', tagline: 'Going a little deeper', intro: 'Memories, dreams and the people who shaped you. Take your time with these.' },
    { name: 'Midnight', tagline: 'Letting each other in', intro: 'The most open of the three. Speak honestly, listen generously.' },
  ] as SetText[],

  // Aron et al. (1997). Questions 27 and 36 use the gender-neutral "them" in place of "him or her".
  questions: [
    { text: 'Given the choice of anyone in the world, whom would you want as a dinner guest?' },
    { text: 'Would you like to be famous? In what way?' },
    { text: 'Before making a telephone call, do you ever rehearse what you are going to say? Why?' },
    { text: 'What would constitute a “perfect” day for you?' },
    { text: 'When did you last sing to yourself? To someone else?' },
    { text: 'If you were able to live to the age of 90 and retain either the mind or body of a 30-year-old for the last 60 years of your life, which would you want?' },
    { text: 'Do you have a secret hunch about how you will die?' },
    { text: 'Name three things you and your partner appear to have in common.' },
    { text: 'For what in your life do you feel most grateful?' },
    { text: 'If you could change anything about the way you were raised, what would it be?' },
    { text: 'Take four minutes and tell your partner your life story in as much detail as possible.', hint: 'Four minutes each. Start the timer whenever the storyteller is ready.' },
    { text: 'If you could wake up tomorrow having gained any one quality or ability, what would it be?' },
    { text: 'If a crystal ball could tell you the truth about yourself, your life, the future or anything else, what would you want to know?' },
    { text: 'Is there something that you’ve dreamed of doing for a long time? Why haven’t you done it?' },
    { text: 'What is the greatest accomplishment of your life?' },
    { text: 'What do you value most in a friendship?' },
    { text: 'What is your most treasured memory?' },
    { text: 'What is your most terrible memory?', hint: 'Share only what feels safe tonight.' },
    { text: 'If you knew that in one year you would die suddenly, would you change anything about the way you are now living? Why?' },
    { text: 'What does friendship mean to you?' },
    { text: 'What roles do love and affection play in your life?' },
    { text: 'Alternate sharing something you consider a positive characteristic of your partner. Share a total of five items.', hint: 'Go back and forth, one quality at a time.' },
    { text: 'How close and warm is your family? Do you feel your childhood was happier than most other people’s?' },
    { text: 'How do you feel about your relationship with your mother?' },
    { text: 'Make three true “we” statements each. For instance, “We are both in this room feeling…”', hint: 'Take turns, one statement at a time.' },
    { text: 'Complete this sentence: “I wish I had someone with whom I could share…”' },
    { text: 'If you were going to become a close friend with your partner, please share what would be important for them to know.' },
    { text: 'Tell your partner what you like about them; be very honest this time, saying things that you might not say to someone you’ve just met.' },
    { text: 'Share with your partner an embarrassing moment in your life.' },
    { text: 'When did you last cry in front of another person? By yourself?' },
    { text: 'Tell your partner something that you like about them already.' },
    { text: 'What, if anything, is too serious to be joked about?' },
    { text: 'If you were to die this evening with no opportunity to communicate with anyone, what would you most regret not having told someone? Why haven’t you told them yet?' },
    { text: 'Your house, containing everything you own, catches fire. After saving your loved ones and pets, you have time to safely make a final dash to save any one item. What would it be? Why?' },
    { text: 'Of all the people in your family, whose death would you find most disturbing? Why?' },
    { text: 'Share a personal problem and ask your partner’s advice on how they might handle it. Also, ask your partner to reflect back to you how you seem to be feeling about the problem you have chosen.' },
  ] as QuestionText[],
};

export type Messages = typeof en;
export default en;
