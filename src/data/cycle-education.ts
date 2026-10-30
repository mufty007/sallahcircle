/** Short, respectful educational notes — not medical or madhhab-specific fatwa. */

export type EduArticle = {
  id: string;
  title: string;
  kicker: string;
  body: string[];
};

export const CYCLE_EDUCATION: EduArticle[] = [
  {
    id: 'prayer-pause',
    title: 'Why prayer pauses',
    kicker: 'FIQH BASICS',
    body: [
      'During ḥayḍ (menstruation) and nifās (postpartum bleeding), the five daily prayers are not required, and missed ones from those days are not made up later.',
      'Your streak here is preserved on purpose — rest is part of worship too.',
      'Ask a trusted local scholar for rulings that fit your school and situation.',
    ],
  },
  {
    id: 'ghusl',
    title: 'Ending with ghusl',
    kicker: 'PURITY',
    body: [
      'When bleeding has clearly stopped and you are confident purity has returned, perform ghusl before praying again.',
      'If you are unsure whether bleeding has ended, wait until you are sure — rushing can create more doubt.',
      'This app never decides purity for you; it only helps you track days privately.',
    ],
  },
  {
    id: 'fasting',
    title: 'Fasting & Ramadan',
    kicker: 'WORSHIP',
    body: [
      'Fasts missed because of ḥayḍ or nifās are typically made up later (qaḍāʾ). Prayers from those days are not.',
      'Use the Qaḍāʾ tool to count days you want to make up when you are ready.',
    ],
  },
  {
    id: 'circles',
    title: 'Your circles stay private',
    kicker: 'COMMUNITY',
    body: [
      'Mates only see that you are “Paused” — never why. Your cycle details stay on your account.',
      'You can still open your circles, read activity, and feel connected while resting.',
    ],
  },
  {
    id: 'care',
    title: 'Care for yourself',
    kicker: 'WELLBEING',
    body: [
      'Track flow only if it helps you notice patterns. Heavy or unusual changes deserve a clinician’s advice — this is not medical care.',
      'Hydrate, rest, and be gentle with yourself. Dhikr and duʿāʾ remain open doors.',
    ],
  },
];
