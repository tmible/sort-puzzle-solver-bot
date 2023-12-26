/* node:coverage disable */
import { FlaskCapacity } from '../../constants/flask-capacity.const.js';
import { NegativePuzzle } from './negative-puzzle.js';
import { getRandomIntInclusive } from '../../utils.js';

/**
 * Выполнение 100 случаных переливаний
 * (с ограничением вреемни для случаев, когда валидных переливаний не осталось)
 * @param {number} flasksNumber требуемое количество заполненных колб
 * @param {number} emptyFlasksNumber требуемое количество пустых колб
 * @param {NagativePuzzle} puzzle негативная игра
 * @returns {boolean} признак успешности подбора всех 100 переливаний за отведённое время
 */
const generateTransfusions = (flasksNumber, emptyFlasksNumber, puzzle) => {
  let transfusionsNumber = 0;
  while (transfusionsNumber < 100) {

    let transfusion = [
      getRandomIntInclusive(0, flasksNumber + emptyFlasksNumber - 1),
      getRandomIntInclusive(0, flasksNumber + emptyFlasksNumber - 1),
      getRandomIntInclusive(1, FlaskCapacity),
    ];

    const startLookingForTransfusion = Date.now();
    while (
      !puzzle.isTransfusionValid(...transfusion) && Date.now() - startLookingForTransfusion < 1000
    ) {
      transfusion = [
        getRandomIntInclusive(0, flasksNumber + emptyFlasksNumber - 1),
        getRandomIntInclusive(0, flasksNumber + emptyFlasksNumber - 1),
        getRandomIntInclusive(1, FlaskCapacity),
      ];
    }

    if (!puzzle.isTransfusionValid(...transfusion)) {
      return false;
    }

    puzzle.transfuse(...transfusion);
    transfusionsNumber += 1;
  }

  return true;
};

/**
 * Распределение слоёв оставшихся не полными колб между ними так,
 * чтобы все оказались либо заполненными, либо пустыми
 * @param {number} flasksNumber требуемое количество заполненных колб
 * @param {number} emptyFlasksNumber требуемое количество пустых колб
 * @param {NagativePuzzle} puzzle негативная игра
 */
const bringNegativePuzzleToSolvedState = (flasksNumber, emptyFlasksNumber, puzzle) => {
  for (let i = 0; i < flasksNumber + emptyFlasksNumber; ++i) {

    if (puzzle.flasks[i].isInFinalState) {
      continue;
    }

    for (let j = 0; j < flasksNumber + emptyFlasksNumber && !puzzle.flasks[i].isInFinalState; ++j) {
      for (let k = puzzle.flasks[i].layers.length; k > 0; --k) {

        if (!puzzle.isTransfusionValid(i, j, k)) {
          continue;
        }

        puzzle.transfuse(i, j, k);
        break;
      }
    }
  }
};

/**
 * Генерация [негативной игры]{@link NegativePuzzle}
 * Заполнение колб, их перемешивание,
 * [выполнение 100 случаных переливаний (с ограничением вреемни для случаев, когда валидных переливаний не осталось)]{@link generateTransfusions},
 * [распределение слоёв оставшихся не полными колб между ними так, чтобы все оказались либо заполненными, либо пустыми]{@link bringNegativePuzzleToSolvedState}
 * @param {number} flasksNumber требуемое количество заполненных колб
 * @param {number} emptyFlasksNumber требуемое количество пустых колб
 * @returns {NagativePuzzle} негативная игра
 */
const generateNegativePuzzle = (flasksNumber, emptyFlasksNumber) => {
  const puzzle = new NegativePuzzle([
    ...new Array(flasksNumber).fill(null).map((_, i) => new Array(FlaskCapacity).fill(i)),
    ...new Array(emptyFlasksNumber).fill(null).map(() => []),
  ].sort(() => Math.random() - 0.5));

  if (!generateTransfusions(flasksNumber, emptyFlasksNumber, puzzle)) {
    return puzzle;
  }

  bringNegativePuzzleToSolvedState(flasksNumber, emptyFlasksNumber, puzzle);

  return puzzle;
};

/**
 * Генерация [игры]{@link Puzzle}
 * @param {number} flasksNumber требуемое количество заполненных колб
 * @param {number} emptyFlasksNumber требуемое количество пустых колб
 * @returns {number[][]} игра в виде [матрицы]{@link Puzzle.layersMatrix} без пустых колб
 */
export const generatePuzzle = (flasksNumber, emptyFlasksNumber) => {
  let puzzle = generateNegativePuzzle(flasksNumber, emptyFlasksNumber);
  while (!puzzle.isSolved) {
    puzzle = generateNegativePuzzle(flasksNumber, emptyFlasksNumber);
  }
  return puzzle.layersMatrix.filter((layer) => layer.length > 0);
};
/* node:coverage enable */
