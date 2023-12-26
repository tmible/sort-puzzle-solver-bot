/**
 * Функция для выбора правильного варианта склонения слов после числительных
 * @param {number} number числительное
 * @param {string[]} declensions варианты склонения
 * @returns {string} подходящий вариант сколнения
 */
export const pluralPipe = (number, declensions) => {
  if (number % 10 === 1 && number % 100 !== 11) {
    return declensions[0];
  }
  if (number % 10 >= 2 && number % 10 <= 4 && (number % 100 < 10 || number % 100 >= 20)) {
    return declensions[1];
  }
  return declensions[2];
};

/**
 * Функция генерации случайного целого числа в заданном диапазоне, включая границы
 * @param {number} min нижняя граница диапазона
 * @param {number} max вернхняя граница диапазона
 * @returns {number} случайное число
 */
export const getRandomIntInclusive = (min, max) => {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1) + Math.ceil(min));
};

/**
 * Функция, которая в строке, содержащей цифры и дефисы определеяет числа и диапазоны
 * (записываются в формате a-b) и возвращает массив всех входящих в указанное множество чисел
 * @param {string} [numbersAndRanges] определение множества в виде строки
 * @returns {number[]} массив входящих целых чисел
 */
export const numbersAndRangesToNumbers = (numbersAndRanges) => {
  return numbersAndRanges
    ?.split(/[^-\d]+/)
    .filter((numberOrRange) => !!numberOrRange)
    .reduce((accum, curr) => {
      if (accum.length > 0 && curr === '-') {
        accum.push(`${accum.pop()}-`);
      } else if (accum.length > 0 && accum.at(-1).at(-1) === '-') {
        accum.push(`${accum.pop()}${curr}`);
      } else {
        accum.push(curr);
      }
      return accum;
    }, [])
    .flatMap((numberOrRange) => {
      if (numberOrRange.indexOf('-') === -1) {
        return [ parseInt(numberOrRange) ];
      }
      const [ start, finish ] = numberOrRange.split('-').map((number) => parseInt(number));
      if (!start || !finish) {
        return [];
      }
      return new Array(finish - start + 1).fill(null).map((_, i) => start + i);
    });
};
