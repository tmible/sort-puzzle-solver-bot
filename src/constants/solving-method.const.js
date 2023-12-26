/* node:coverage disable */
/**
 * Перечисление методов решения
 * @enum {string}
 */
export const SolvingMethod = {
  /** Самый быстрый */
  Fastest: 'fastest',

  /**
   * Находящий почти самое короткое или самое короткое решение за время,
   * сопоставимое или значительно меньшее, по сравнением со временем самого быстрого метода
   */
  Balanced: 'balanced',

  /** Находящий самое короткое решение */
  Shortest: 'shortest',
};
/* node:coverage enable */
