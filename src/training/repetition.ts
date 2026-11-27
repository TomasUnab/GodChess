export type ReviewCard = { puzzleId: string; dueAt: number; intervalDays: number; ease: number; lapses: number };

/** Small offline SM-2 style scheduler for puzzle repetition. */
export function scheduleReview(card: ReviewCard | undefined, solved: boolean, now = Date.now()): ReviewCard {
  if (!card) return { puzzleId:'', dueAt:now+(solved?86400000:60000), intervalDays:solved?1:0, ease:solved?2.5:2.2, lapses:solved?0:1 };
  if (!solved) return { ...card, dueAt:now+60000, intervalDays:0, ease:Math.max(1.3,card.ease-0.2), lapses:card.lapses+1 };
  const intervalDays = card.intervalDays < 1 ? 1 : Math.max(2, Math.round(card.intervalDays*card.ease));
  return { ...card, dueAt:now+intervalDays*86400000, intervalDays, ease:Math.min(3,card.ease+0.1) };
}

export function dueReviews(cards: Record<string, ReviewCard>, now=Date.now()) { return Object.values(cards).filter(card=>card.dueAt<=now).sort((a,b)=>a.dueAt-b.dueAt); }
