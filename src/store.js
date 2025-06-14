import { create } from 'zustand';

export const useScore = create(set => ({
  // 判定ごとの回数
  counts: { perfect: 0, good: 0, bad: 0 },

  // 合計得点
  score: 0,

  // 判定を受け取って state を更新
  add: r =>
    set(s => {
      const POINT = { perfect: 5, good: 3, bad: 0 }[r] || 0;
      return {
        counts: { ...s.counts, [r]: s.counts[r] + 1 },
        score: s.score + POINT,
      };
    }),

  // 全リセット
  reset: () =>
    set({ counts: { perfect: 0, good: 0, bad: 0 }, score: 0 }),
}));
