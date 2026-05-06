
export interface InsightStory {
  id: string;
  title: string;
  imageUrl: string;
  content: string;
}

export interface DailyInsight {
  id: string;
  previewTitle: string;
  previewEmoji: string;
  previewColorHex: string;
  stories: InsightStory[];
}

export interface RecommendedArticle {
  title: string;
  time: string;
  emoji: string;
}

export const DAILY_INSIGHTS_LIBRARY: Record<string, { stories: DailyInsight[], articles: RecommendedArticle[] }> = {
  menstrual: {
    stories: [
      {
        id: 'm1',
        previewTitle: 'Self-Care Mode',
        previewEmoji: '🕯️',
        previewColorHex: '#F472B6',
        stories: [
          {
            id: 'ms1',
            title: 'Inner Reflection',
            imageUrl: '',
            content: 'Your body is working hard right now. This is a natural time for rest and inward reflection. Don\'t feel guilty about taking it slow.'
          },
          {
            id: 'ms2',
            title: 'Hydration is Key',
            imageUrl: '',
            content: 'Drinking warm water can help soothe cramps and keep you hydrated. Add a slice of ginger for extra comfort.'
          }
        ]
      }
    ],
    articles: [
      { title: 'Iron-rich foods for your period', time: '4 min read', emoji: '🥩' },
      { title: 'Gentle yoga for cramps', time: '5 min read', emoji: '🧘‍♀️' },
      { title: 'Understanding heavy flow', time: '3 min read', emoji: '💧' },
    ]
  },
  follicular: {
    stories: [
      {
        id: 'f1',
        previewTitle: 'Today\'s Energy',
        previewEmoji: '⚡',
        previewColorHex: '#EAB308',
        stories: [
          {
            id: 'fs1',
            title: 'Energy Peak',
            imageUrl: '',
            content: 'You are entering your follicular phase! Estrogen is rising, which means you might experience a surge in energy and creativity today.'
          },
          {
            id: 'fs2',
            title: 'Movement Tip',
            imageUrl: '',
            content: 'It\'s a great day for a high-intensity workout. Try a new class or go for a run. Your body is primed for action.'
          }
        ]
      }
    ],
    articles: [
      { title: 'Setting goals this month', time: '3 min read', emoji: '🚀' },
      { title: 'The power of estrogen', time: '5 min read', emoji: '⚡' },
      { title: 'New routines to try', time: '4 min read', emoji: '✨' },
    ]
  },
  ovulation: {
    stories: [
      {
        id: 'o1',
        previewTitle: 'Radiant Glow',
        previewEmoji: '✨',
        previewColorHex: '#8B5CF6',
        stories: [
          {
            id: 'os1',
            title: 'Social Battery',
            imageUrl: '',
            content: 'Your social confidence is likely at its peak. It\'s a perfect time for presentations, dates, or meeting new people!'
          }
        ]
      }
    ],
    articles: [
      { title: 'Signs you are ovulating', time: '4 min read', emoji: '🥚' },
      { title: 'Maximizing your energy', time: '3 min read', emoji: '🔥' },
      { title: 'Skin glow tips', time: '2 min read', emoji: '✨' },
    ]
  },
  luteal: {
    stories: [
      {
        id: 'l1',
        previewTitle: 'Slow Down',
        previewEmoji: '☁️',
        previewColorHex: '#6366F1',
        stories: [
          {
            id: 'ls1',
            title: 'Patience Practice',
            imageUrl: '',
            content: 'As progesterone rises, you might feel more sensitive. Be extra kind to yourself today.'
          }
        ]
      }
    ],
    articles: [
      { title: 'Managing PMS mood swings', time: '5 min read', emoji: '☁️' },
      { title: 'Pre-period snack guide', time: '4 min read', emoji: '🍫' },
      { title: 'Sleep better tonight', time: '3 min read', emoji: '🌙' },
    ]
  },
  waiting: {
    stories: [],
    articles: [
      { title: 'Understanding cycle variations', time: '4 min read', emoji: '📊' },
    ]
  }
};
