import crypto from 'crypto';
import { isMainThread, parentPort, workerData } from 'worker_threads';
import PriorityQueue from 'js-priority-queue';
import { DefaultEmptyFlasksNumber } from './constants/default-empty-flasks-number.const.js';
import { MaxEmptyFlasksNumber } from './constants/max-empty-flasks-number.const.js';
import { SolvingMethod } from './constants/solving-method.const.js';
import { Puzzle } from './puzzle.js';

/**
 * Модуль поиска решения
 * Находит решение игры
 * Не имеет экспортируемых функций, так как запускается в отдельном потоке как скрипт
 *
 * Шаг поиска решения для стека. Содержит:
 * - текущее состояние игры,
 * - массив сделанных переливаний.
 * @typedef {{ puzzle: Puzzle, transfusions: number[][] }} StackStep
 *
 * Шаг поиска решения для очереди с приоритетом. Содержит:
 * - текущее состояние игры,
 * - метрику решённости в текущем состоянии,
 * - массив сделанных переливаний.
 * @typedef {{ puzzle: Puzzle, metric: number, transfusions: number[][] }} PriorityQueueStep
*/

/**
 * Вычисление метрики решённости
 * Чем больше во всех колбах в совокупности слоёв одного цвета подряд,
 * тем больше значение метрики
 * @param {Puzzle} puzzle игра
 * @returns {number} метрика решённости
 */
const calculateSolutionMetric = (puzzle) => {
  let metric = 0;
  for (const flask of puzzle.flasks) {
    for (let i = 1; i < flask.layers.length; ++i) {
      if (flask.layers[i] === flask.layers[i - 1]) {
        metric += 1;
      }
    }
  }
  return metric;
};

/**
 * Шаблонная функция поиска решения для способа и [с очередью с приоритетом]{@link solveUsingPriorityQueue},
 * и [со стеком]{@link solveUsingStack}, выполняющая перебор возможных ходов, пока не найдёт решение
 * @param {Puzzle} puzzle игра
 * @param {StackStep[]|PriorityQueue<PriorityQueueStep>} stackOrQueue стек или очередь
 * @param {(step: StackStep|PriorityQueueStep) => boolean} preliminaryFilter функция предварительного относительно перебора комбинаций переливания фильтра
 * @param {string} getStep название метода получения очередного шага со стека или из очереди
 * @param {string} addStep название метода добавления очередного шага на стек или в очередь
 * @param {(step: StackStep|PriorityQueueStep, state: Puzzle, transfusion: number[]) => StackStep|PriorityQueueStep} initializeNextStep функция инициализации следующего шага
 * @returns {number[][]} массив пар номеров колб для [переливания]{@link Puzzle.transfuse}
 */
const solveUsingPriorityQueueOrStack = (
  puzzle,
  stackOrQueue,
  preliminaryFilter,
  getStep,
  addStep,
  initializeNextStep,
) => {
  // Множество отпечатков посещённых ранее состояний игры
  // Нужно, чтобы избежать циклов и повторного обхода уже отброшенного поддерева
  const visited = new Set([
    crypto.createHash('md5').update(puzzle.toStringWithSort()).digest('hex'),
  ]);

  while (stackOrQueue.length > 0) {

    const step = stackOrQueue[getStep]();

    if (!preliminaryFilter(step)) {
      continue;
    }

    for (let i = 0; i < step.puzzle.flasks.length; ++i) {
      for (let j = 0; j < step.puzzle.flasks.length; ++j) {
        if (!step.puzzle.isTransfusionValid(i, j)) {
          continue;
        }

        const state = step.puzzle.copy();
        state.transfuse(i, j);

        const nextFingerprint = crypto
          .createHash('md5')
          .update(state.toStringWithSort())
          .digest('hex');
        if (visited.has(nextFingerprint)) {
          continue;
        }
        visited.add(nextFingerprint);

        const nextStep = initializeNextStep(step, state, [ i, j ]);

        if (nextStep.puzzle.isSolved) {
          return nextStep.transfusions;
        }

        if (preliminaryFilter(nextStep)) {
          stackOrQueue[addStep](nextStep);
        }
      }
    }
  }
};

/**
 * [Поиск решения]{@link solveUsingPriorityQueueOrStack} с использованием очереди с приоритетом
 * Приоритет определяется по количеству ходов, если они равны по [метрике решённости]{@link calculateSolutionMetric},
 * причём, перед тем как начать перебирать комбинации для переливания, каждый шаг проверяется на то,
 * что его метрика является максимальной с некоторым допуском для его количества ходов
 * @param {Puzzle} puzzle игра
 * @param {number} maxAllowedMetricDelta максимальная допустимая разница между [метрикой решённости]{@link calculateSolutionMetric}
 * на очередном шаге и максимальным значением для того же количества ходов
 * @returns {number[][]} массив пар номеров колб для [переливания]{@link Puzzle.transfuse}
 */
const solveUsingPriorityQueue = (puzzle, maxAllowedMetricDelta) => {
  const queue = new PriorityQueue({
    comparator: (a, b) => {
      if (a.transfusions.length !== b.transfusions.length) {
        return a.transfusions.length - b.transfusions.length;
      }
      return b.metric - a.metric;
    },
    initialValues: [{
      puzzle,
      metric: calculateSolutionMetric(puzzle),
      transfusions: [],
    }],
  });

  // Максимальная метрика для каждого количества ходов
  // Нужно, чтобы при переборе вариантов с одинаковым количеством ходов
  // рассматривать только самые выгодные
  const metricMap = new Map();

  return solveUsingPriorityQueueOrStack(
    puzzle,
    queue,
    (step) => {
      if (metricMap.has(step.transfusions.length)) {
        const maxMetric = metricMap.get(step.transfusions.length);
        if (maxMetric > step.metric + maxAllowedMetricDelta) {
          return false;
        }
        if (maxMetric < step.metric) {
          metricMap.set(step.transfusions.length, step.metric);
        }
      } else {
        metricMap.set(step.transfusions.length, step.metric);
      }
      return true;
    },
    'dequeue',
    'queue',
    (step, puzzle, nextTransfusion) => ({
      puzzle,
      metric: calculateSolutionMetric(puzzle),
      transfusions: [ ...step.transfusions, nextTransfusion ],
    }),
  );
};

/**
 * [Поиск решения]{@link solveUsingPriorityQueueOrStack} с использованием стека
 * @param {Puzzle} puzzle игра
 * @returns {number[][]} массив пар номеров колб для [переливания]{@link Puzzle.transfuse}
 */
const solveUsingStack = (puzzle) => {
  const stack = [{
    puzzle,
    transfusions: [],
  }];

  return solveUsingPriorityQueueOrStack(
    puzzle,
    stack,
    () => true,
    'pop',
    'push',
    (step, puzzle, nextTransfusion) => ({
      puzzle,
      transfusions: [ ...step.transfusions, nextTransfusion ],
    }),
  );
};

/**
 * Поиск решения последовательно с разным количеством пустых колб
 * @param {number[][]} layersMatrix игра в виде матрицы {@link Puzzle.layersMatrix}
 * @param {SolvingMethod} [solvingMethod=SolvingMethod.Fastest] выбранный метод решения. От этого параметра зависит выбор стека или очереди с приоритетом
 * @returns {[ number[][], number ]} массив пар номеров колб для [переливания]{@link Puzzle.transfuse} и необходимое количество пустых колб
 */
const solve = (layersMatrix, solvingMethod = SolvingMethod.Fastest) => {
  let solution = undefined;

  let i = DefaultEmptyFlasksNumber;
  for (; i <= MaxEmptyFlasksNumber; ++i) {

    const layersMatrixWithEmptyFlasks = [
      ...layersMatrix,
      ...new Array(i).fill(null).map(() => []),
    ];

    switch (solvingMethod) {
      case SolvingMethod.Shortest:
        solution = solveUsingPriorityQueue(new Puzzle(layersMatrixWithEmptyFlasks), 1);
        break;
      case SolvingMethod.Balanced:
        solution = solveUsingPriorityQueue(new Puzzle(layersMatrixWithEmptyFlasks), 0);
        break;
      case SolvingMethod.Fastest:
      default:
        solution = solveUsingStack(new Puzzle(layersMatrixWithEmptyFlasks));
        break;
    }

    if (!!solution) {
      break;
    }
  }

  return [ solution, i ];
};

/**
 * Запуск поиска решения и передача результата в основной поток
 * в случае запуска скрипта не в основном потоке
 */
if (!isMainThread) {
  parentPort.postMessage(solve(...workerData));
}
