import { createCanvas } from 'canvas';
import getPixels from 'get-pixels';
import {
  CurrentSpotNumberOpacity,
} from './constants/image-options/current-spot-number-opacity.const.js';
import {
  PreviousSpotNumberOpacity,
} from './constants/image-options/previous-spot-number-opacity.const.js';
import { SpotNumberStrokeColor } from './constants/image-options/spot-number-stroke-color.const.js';
import { SpotNumberTextColor } from './constants/image-options/spot-number-text-color.const.js';
import { FlaskCapacity } from './constants/flask-capacity.const.js';
import {
  MaxAllowedColorDistanceForClusterization,
} from './constants/max-allowed-color-distance-for-clusterization.const.js';
import { MaxAllowedCoordinatesDelta } from './constants/max-allowed-coordinates-delta.const.js';
import { SpotsInRunNumber } from './constants/spots-in-run-number.const.js';
import { prepareImage, fullfillImage } from './visualizer.js';

/**
 * Модуль анализа изображений
 * Определяет на изображениях цветные пятна, отмечает их номерами, формирует [игру]{@link Puzzle}
 *
 * 3 байта RGB цвета
 * @typedef {[ number, number, number ]} Color
 *
 * 3 байта RGB цвета, разделённые запятыми
 * @typedef {string} ColorAsString
 *
 * Положение цвета в колбе. Порядковый номер колбы и порядковый номер слоя в ней
 * @typedef {{ flask: number, index: number }} ColorInFlask
 *
 * Ширина, высота и глубина цвета (в байтах) изображения
 * @typedef {[ number, number, number ]} Shape
 *
 * Двумерные координаты
 * @typedef {[ number, number ]} Coordinates
 *
 * Пятно -- совокупность смежных пикселей одного цвета,
 * либо объединение таких пятен, полученное в результате кластеризации
 * @typedef {Object} Spot
 * @property {number} id идентификатор пятна
 * @property {Coordinates} start координаты первого встреченного пикселя пятна
 * @property {number} square площадь пятна
 * @property {Color} color цвет пятна
 * @property {Coordinates} top верхний пиксель пятна
 * @property {Coordinates} bottom нижний пиксель пятна
 * @property {Coordinates} left самая левый пиксель пятна
 * @property {Coordinates} right самая правый пиксель пятна
 * @property {boolean} isAbsorbed признак того, что пятно поглощено другим при кластеризации
 * @property {boolean} [isInFlask] признак того, что пятно отнесено к некоторой колбе
 * @property {number} [length] количество слоёв, которое пятно занимает в колбе
 *
 * Слой пикселей -- совокупность смежных по вертикали пискелей,
 * принадлежащих либо одному и только одному пятну из выбранных, либо нескольким из не выбранных
 * @typedef {Object} Layer
 * @property {?number} id идентификатор пятна, которому принадлежит пиксель. Null если пиксели принадлежат не выбранным пятнам
 * @property {boolean} hasBackgroundColor признак того, что цвет хотя бы одного пикселя равен цвету фона
 * @property {number} [height] протяжённость слоя в пикселях
*/

/**
 * Обход пикселей
 * @param {Coordinates} start координаты начального пикселя в матрице пикселей
 * @param {boolean[][]} visited матрица признаков посещённости пикселей
 * @param {Shape} shape ширина, высота и глубина цвета изображения
 * @param {(i: Coordinates[0], j: Coordinates[1]) => any} DFSBody обработка очередного встреченного пикселя
 * @param {(next: Coordinates, [i: Coordinates[0], j: Coordinates[1]]) => boolean} stackFilter дополнительный фильтр кандидатов на продолжение обхода
 */
const traversePixels = (start, visited, shape, DFSBody, stackFilter) => {
  const stack = [ start ];

  while (stack.length > 0) {
    const [ i, j ] = stack.pop();

    visited[i][j] = true;

    DFSBody(i, j);

    stack.push(
      ...[ [ i, j - 1 ], [ i, j + 1 ], [ i - 1, j ], [ i + 1, j ] ]
      .filter((next) => {
        if (
          next[0] < 0 ||
          next[1] < 0 ||
          next[0] >= shape[1] ||
          next[1] >= shape[0] ||
          visited[next[0]][next[1]]
        ) {
          return false;
        }
        return stackFilter(next, [ i, j ]);
      }),
    );
  }
};

/**
 * Определение [пятен]{@link Spot} в матрице пикселей
 * При итерации по матрице пикселей, если встречается ещё не посещённый пиксель,
 * от него запускается обход всех смежных пикселей одного цвета для формирования из них пятна
 * @param {Shape} shape ширина, высота и глубина цвета изображения
 * @param {Color[][]} pixels матрица пикселей
 * @returns {[ Spot[], number[][] ]} массив определённых пятен, отсортированный в порядке убывания площади,
 * и матрица идентификаторов пятен, к которым относятся пиксели с соответствующими координатами
 */
const constructSpots = (shape, pixels) => {
  const spots = [];
  const visited = new Array(shape[1]).fill(null).map(() => new Array(shape[0]).fill(false));
  const mask = new Array(shape[1]).fill(null).map(() => new Array(shape[0]).fill(null));

  for (let i = 0; i < shape[1]; ++i) {
    for (let j = 0; j < shape[0]; ++j) {
      if (visited[i][j]) {
        continue;
      }

      let square = 1;
      let start = [ i, j ];
      let top = i;
      let bottom = i;
      let left = j;
      let right = j;

      traversePixels(
        start,
        visited,
        shape,
        (i, j) => {
          mask[i][j] = spots.length;
          square += 1;

          if (i < top) {
            top = i;
          }
          if (i > bottom) {
            bottom = i;
          }
          if (j < left) {
            left = j;
          }
          if (j > right) {
            right = j;
          }
        },
        (next) => pixels[next[0]][next[1]].join(',') === pixels[i][j].join(','),
      );

      spots.push({
        id: spots.length,
        start,
        square,
        color: pixels[start[0]][start[1]].slice(),
        top,
        bottom,
        left,
        right,
        isAbsorbed: false,
      });
    }
  }

  return [ spots.sort((a, b) => b.square - a.square), mask ];
};

/**
 * Кластеризация [пятен]{@link Spot}
 * При итерации по пятнам, если встречается ещё не поглощённое пятно,
 * от него запускается обход всех смежных пикселей, цвет которых удовлетворяет
 * [допуску]{@link MaxAllowedColorDistanceForClusterization} относительно цвета пятна
 * @param {Shape} shape ширина, высота и глубина цвета изображения
 * @param {Color[][]} pixels матрица пикселей
 * @param {Spot[]} spots массив пятен
 * @param {number[][]} mask матрица идентификаторов пятен, к которым относятся пиксели с соответствующими координатами
 * @returns {Spot[]} массив кластеров, отсортированный в порядке убывания площади
 */
const clusterizeSpots = (shape, pixels, spots, mask) => {
  const clusters = [];
  const visited = new Array(shape[1]).fill(null).map(() => new Array(shape[0]).fill(false));

  for (let spotIndex = 0; spotIndex < spots.length; ++spotIndex) {
    if (visited[spots[spotIndex].start[0]][spots[spotIndex].start[1]]) {
      spots[spotIndex].isAbsorbed = true;
      continue;
    }

    clusters.push(spots[spotIndex]);

    traversePixels(
      spots[spotIndex].start,
      visited,
      shape,
      (i, j) => {
        if (mask[i][j] !== spots[spotIndex].id) {
          mask[i][j] = spots[spotIndex].id;
          spots[spotIndex].square += 1;
        }

        if (i < spots[spotIndex].top) {
          spots[spotIndex].top = i;
        }
        if (i > spots[spotIndex].bottom) {
          spots[spotIndex].bottom = i;
        }
        if (j < spots[spotIndex].left) {
          spots[spotIndex].left = j;
        }
        if (j > spots[spotIndex].right) {
          spots[spotIndex].right = j;
        }
      },
      (next, [ i, j ]) => {
        const pixel = pixels[i][j];
        const nextPixel = pixels[next[0]][next[1]];
        const colorDistance = Math.sqrt(
          pixel.reduce((sum, byte, i) => sum + Math.pow(byte - nextPixel[i], 2), 0),
        );
        return colorDistance < MaxAllowedColorDistanceForClusterization;
      },
    );
  }

  return clusters.sort((a, b) => b.square - a.square);
};

/**
 * Заполнение массива колб номерами, соответствующими цветам в колбах на изображении
 * @param {number} flasksNumber количество колб
 * @param {Map<ColorAsString, ColorInFlask[]>} colorsMap соответствие цветов и слоёв в колбах
 * @returns {number[][]} игра в виде матрицы {@link Puzzle.layersMatrix}
 */
const fullfillPuzzle = (flasksNumber, colorsMap) => {
  const layersMatrix = new Array(flasksNumber).fill(null).map(() => new Array(FlaskCapacity));

  const colors = [ ...colorsMap.values() ];

  for (let i = 0; i < colors.length; ++i) {
    for (const entry of colors[i]) {
      layersMatrix[entry.flask][entry.index] = i;
    }
  }

  return layersMatrix;
};

/**
 * Определение [слоёв пикселей]{@link Layer} вдоль заданной координаты
 * @param {Shape} shape ширина, высота и глубина цвета изображения
 * @param {Spot[]} spots массив пятен
 * @param {number[][]} mask матрица идентификаторов пятен, к которым относятся пиксели с соответствующими координатами
 * @param {Set<number>} spotsIds множество идентификаторов выбранных пятен
 * @param {number} horizontalMiddle координата, вдоль которой будут определяться слои
 * @returns {Layer[]} массив определённых слоёв пикселей
 */
const scanSpotsAlongMiddle = (shape, spots, mask, spotsIds, horizontalMiddle) => {
  const layers = [];

  for (let i = shape[1] - 1, previousI = i, hasBackgroundColor = false; i >= 0; --i) {
    if (i === 0) {
      layers.push({
        id: spotsIds.has(mask[i][horizontalMiddle]) ?
          mask[i][horizontalMiddle] :
          null,
        height: previousI,
        hasBackgroundColor,
      });
      continue;
    }

    if (
      (
        !spotsIds.has(mask[i][horizontalMiddle]) &&
        !spotsIds.has(mask[previousI][horizontalMiddle])
      ) ||
      mask[i][horizontalMiddle] === mask[previousI][horizontalMiddle]
    ) {

      // установка признака наличия пикселей такого же цвета, как и фон,
      // исходя из предположения, что фон -- самое большое по площади пятно
      if (
        spots.find(({ id }) => id === mask[i][horizontalMiddle]).color.join(',') ===
        spots[0].color.join(',')
      ) {
        hasBackgroundColor = true;
      }

      continue;
    }

    layers.push({
      id: spotsIds.has(mask[i + 1][horizontalMiddle]) ?
      mask[i + 1][horizontalMiddle] :
      null,
      height: previousI - i,
      hasBackgroundColor,
    });

    // поиск дубликатов на случай наличия дыр в пятнах
    // если выясняется, что такой идентификатор встречается не впервые,
    // все слои между повторами, как и сами повторы, сливаются в один слой
    const duplicateIndex = layers.findLastIndex(({ id }) => id === mask[i][horizontalMiddle]);
    let duplicateHeight = 0;
    if (duplicateIndex !== -1) {
      for (
        let j = layers.length - 1;
        j >= duplicateIndex;
        --j, duplicateHeight += layers.pop().height
      );
    }

    previousI = duplicateIndex === -1 ? i : i + duplicateHeight;
    hasBackgroundColor = false;
  }

  return layers;
};

/**
 * Выделение колбы из последовательности [слоёв пикселей]{@link Layer}
 * @param {Spot[]} spots массив пятен
 * @param {number} currentSpotId идентификатор пятна, при итерации которого было запущено определение слоёв и выделение колбы из их последовательности
 * @param {Layer[]} layers последовательность слоёв пикселей вдоль середины пятна с идентификатором currentSpotId
 * @returns {Spot[]} колба в формате массива образующих её пятен
 */
const extractFlaskFromLayers = (spots, currentSpotId, layers) => {
  // определение индексов первого и последнего
  // из "цветных" (принадлежащих выбранным пятнам) слоёв пикселей,
  // а также индексов слоёв пикселей между ними, содержащих пиксели цвета фона, --
  // разделителей колб из разных рядов
  const firstColorLayerIndex = layers.findIndex(({ id }) => id !== null);
  const lastColorLayerIndex = layers.findLastIndex(({ id }) => id !== null);
  const gapsBetweenFlasksIndices = new Set(layers
    .map((layer, i) => ({ ...layer, index: i }))
    .filter((layer) =>
      layer.index >= firstColorLayerIndex &&
      layer.index <= lastColorLayerIndex &&
      layer.id === null &&
      layer.hasBackgroundColor
    )
    .map(({ index }) => index)
  );
  let flask = [];

  for (let i = 0; i < layers.length; ++i) {
    if (layers[i].id !== null) {
      flask.push(layers[i]);
      continue;
    }

    if (gapsBetweenFlasksIndices.has(i) || i === layers.length - 1) {
      // проверка наличия в собранной колбе текущего пятна
      // в случае его отсутвтия пропуск колбы
      if (!flask.map(({ id }) => id).includes(currentSpotId)) {
        flask = [];
        continue;
      }

      // в противном случае -- определение относительной высоты каждого пятна и возврат колбы
      const minHeight = Math.min(...flask.map(({ height }) => height));
      return flask.map((layer) => {
        const spot = spots.find(({ id }) => id === layer.id);
        spot.isInFlask = true;
        spot.length = Math.round(layer.height / minHeight);
        return spot;
      });
    }
  }

  return flask;
};

/**
 * Определение цветов в колбах
 * @param {Spot[][]} flasks массив колб в формате массива образующих её пятен
 * @returns {Map<ColorAsString, ColorInFlask>} соответствие цветов и слоёв колб
 */
const detectColorsInFlasks = (flasks) => {
  const colorsMap = new Map();

  for (let i = 0; i < flasks.length; ++i) {
    for (let j = 0, layerIndex = 0; j < flasks[i].length; ++j) {

      if (!colorsMap.has(flasks[i][j].color.join(','))) {
        colorsMap.set(flasks[i][j].color.join(','), []);
      }

      for (let l = 0; l < flasks[i][j].length; ++l, ++layerIndex) {
        colorsMap.get(flasks[i][j].color.join(',')).push({ flask: i, index: layerIndex });
      }

    }
  }

  return colorsMap;
};

/**
 * Определение колб на изображении
 * Для каждого пятна:
 * 1. Проверка, что оно выбрано и ещё не отнесено к какой-либо колбе
 * 2. [Определение слоёв пикселей вдоль координаты середины пятна]{@link scanSpotsAlongMiddle}
 * 3. [Выделение колбы из последовательности слоёв пикселей]{@link extractFlaskFromLayers}
 * Сортировка определённых колб по координатам так, чтобы они нумеровались естественным образом (слоева направо, сверху вниз)
 * Определение цветов слоёв колб
 * @param {Shape} shape ширина, высота и глубина цвета изображения
 * @param {Color[][]} pixels матрица пикселей
 * @param {Spot[]} spots массив пятен
 * @param {number[][]} mask матрица идентификаторов пятен, к которым относятся пиксели с соответствующими координатами
 * @param {Set<number>} spotsIndices индексы выбранных пятен
 * @returns {[ Spot[][], Map<ColorAsString, ColorInFlask> ]} массив определённых колб и соответствие цветов и слоёв колб
 */
const detectFlasks = (shape, pixels, spots, mask, spotsIndices) => {
  const spotsIds = new Set([ ...spotsIndices ].map((i) => spots[i].id));
  const flasks = [];

  for (let i = 0; i < spots.length; ++i) {

    const spot = spots[i];
    if (!spotsIds.has(spot.id) || spot.isInFlask) {
      continue;
    }

    const horizontalMiddle = Math.round((spot.right + spot.left) / 2);
    const layers = scanSpotsAlongMiddle(shape, spots, mask, spotsIds, horizontalMiddle);

    flasks.push(extractFlaskFromLayers(spots, spot.id, layers));
  }

  flasks.sort((a, b) => {
    if (Math.abs(1 - (a.at(-1).top / b.at(-1).top)) < MaxAllowedCoordinatesDelta) {
      return a.at(-1).left - b.at(-1).left;
    }
    return a.at(-1).top - b.at(-1).top;
  });

  return [ flasks, detectColorsInFlasks(flasks) ];
};

/**
 * Определение [пятен]{@link Spot} на изображении
 * 1. [Чтение изображения]{@link getPixels} и его интерпретация в матрицу пикселей
 * 2. [Определение пятен]{@link constructSpots}
 * 3. [Кластеризация пятен]{@link clusterizeSpots}
 * @param {Buffer} imageBuffer байты файла изображения
 * @param {string} mimeType mime-тип изображения
 * @returns {Promise<[ Shape, Color[][], Spot[], number[][] ]>}
 * ширина, высота и глубина цвета изображения
 * матрица пикселей изображения
 * массив кластеров [пятен]{@link Spot}
 * матрица идентификаторов кластеров, к которым относятся пиксели с соответствующими координатами
 */
export const detectSpots = (imageBuffer, mimeType = 'image/jpeg') => {
  return new Promise((resolve, reject) => {
    getPixels(imageBuffer, mimeType, (err, imageData) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const { data, shape } = imageData;

        const pixels = new Array(shape[1]).fill(null).map((_, i) =>
          new Array(shape[0]).fill(null).map((_, j) => [
            ...data.subarray(
              (i * shape[0] + j) * shape[2],
              (i * shape[0] + j) * shape[2] + (shape[2] - 1)
            ).values(),
          ])
        );

        const [ spots, mask ] = constructSpots(shape, pixels);
        const clusters = clusterizeSpots(shape, pixels, spots, mask);

        resolve([ shape, pixels, clusters, mask ]);
      } catch(err) {
        reject(err);
      }
    });
  });
};

/**
 * Добавление на исходное изображение номеров [пятен]{@link Spot}
 * @param {Shape} shape ширина, высота и глубина цвета изображения
 * @param {Color[][]} pixels матрица пикселей изображения
 * @param {Spot[]} spots массив [пятен]{@link Spot}
 * @param {number[][]} mask матрица идентификаторов пятен, к которым относятся пиксели с соответствующими координатами
 * @param {number} runNumber номер запуска функции. Нужен для определения диапазона отмечаемых номерами пятен
 * @returns {Buffer} буфер с содержимым Canvas
 */
export const markSpots = (shape, pixels, spots, mask, runNumber) => {
  const canvas = createCanvas(shape[0], shape[1]);
  const ctx = canvas.getContext('2d');
  const visited = new Array(shape[1]).fill(null).map(() => new Array(shape[0]).fill(false));

  // сначала копирование на холст пикселей пятен, которые нужно отметить
  for (let i = 0; i < SpotsInRunNumber * (runNumber + 1) && i < spots.length; ++i) {
    const spot = spots[i];
    ctx.fillStyle = `rgb(${pixels[spot.start[0]][spot.start[1]].join(',')})`;

    traversePixels(
      spot.start,
      visited,
      shape,
      (i, j) => ctx.fillRect(j, i, 1, 1),
      (next, [ i, j ]) => mask[i][j] === mask[next[0]][next[1]],
   );

    // определение стиля текста для номера в зависимости от того,
    // добавляется он в этом запуске первый раз или был добавлен в одном из предыдущих
    const opacity = i < SpotsInRunNumber * runNumber ?
      PreviousSpotNumberOpacity :
      CurrentSpotNumberOpacity;
    ctx.fillStyle = `rgba(${SpotNumberTextColor},${opacity}`;
    ctx.strokeStyle = `rgba(${SpotNumberStrokeColor},${opacity}`;
    ctx.font = `${Math.round((spot.bottom - spot.top) / 3)}px sans-serif`;

    const verticalMiddle = Math.round((spot.bottom + spot.top) / 2);
    const horizontalMiddle = Math.round((spot.right + spot.left) / 2);
    const measurements = ctx.measureText(i + 1);

    ctx.fillText(i + 1, horizontalMiddle - measurements.width / 2, verticalMiddle);
    ctx.strokeText(i + 1, horizontalMiddle - measurements.width / 2, verticalMiddle);
  }

  // после этого копирование на холст пикселей всех остальных пятен
  for (let i = 0; i < shape[1]; ++i) {
    for (let j = 0; j < shape[0]; ++j) {
      const spotIndex = spots.findIndex(({ id }) => id === mask[i][j]);
      if (spotIndex < SpotsInRunNumber * (runNumber + 1)) {
        continue;
      }
      const spot = spots[spotIndex];
      ctx.fillStyle = `rgb(${pixels[spot.start[0]][spot.start[1]].join(',')})`;
      ctx.fillRect(j, i, 1, 1);
    }
  }

  return canvas.toBuffer();
};

/**
 * [Определение колб на изображении]{@link detectFlasks} и соотнесение цветов их слоёв с их слоями
 * [Подготовка изображения для демонстрации результата работы алгоритма]{@link prepareImage}
 * и его [заполнение]{@link fullfillImage} с предварительным [заполнением игры]{@link fullfillPuzzle}
 * @param {Shape} shape ширина, высота и глубина цвета изображения
 * @param {Color[][]} pixels матрица пикселей изображения
 * @param {Spot[]} spots массив [пятен]{@link Spot}
 * @param {number[][]} mask матрица идентификаторов пятен, к которым относятся пиксели с соответствующими координатами
 * @param {Set<number>} spotsIndices множество номеров выбранных пятен
 * @returns {[ number[][], Buffer, ColorAsString[], { number, number[] } ]}
 * игра в виде матрицы {@link Puzzle.layersMatrix}
 * распознанные колбы в формате изображения
 * массив цветов; по индексам устанавливается соответсвие слоям в игре в виде матрицы {@link Puzzle.layersMatrix}
 * количество рядов колб и количество колб в каждом ряду, распознанные на входном изображении
 */
export const analyzeImage = (shape, pixels, spots, mask, spotsIndices) => {
  const [ flasks, colorsMap ] = detectFlasks(shape, pixels, spots, mask, spotsIndices);

  const flasksTopFractions = flasks.map((flask) =>
    Math.round(flask.at(-1).top / flasks[0].at(-1).top)
  );

  const rowsNumber = new Set(flasksTopFractions).size;

  const flasksInRows = flasksTopFractions.reduce((accum, fraction) => {
    if (fraction === accum.at(-1)[0]) {
      accum.at(-1)[1] += 1;
    } else {
      accum.push([ fraction, 1 ]);
    }
    return accum;
  }, [ [ flasksTopFractions[0], 0 ] ]).map(([ _, numberInRow ]) => numberInRow);

  const [ canvas, ctx ] = prepareImage(rowsNumber, flasksInRows);

  const layersMatrix = fullfillPuzzle(flasks.length, colorsMap);

  const colors = [ ...colorsMap.keys() ];

  fullfillImage(rowsNumber, flasksInRows, layersMatrix, colors, ctx);

  return [ layersMatrix, canvas.toBuffer(), colors, { rowsNumber, flasksInRows } ];
};

export let forTesting;
if (!!process.env.NODE_TEST_CONTEXT) {
  forTesting = {
    traversePixels,
    constructSpots,
    clusterizeSpots,
    fullfillPuzzle,
    scanSpotsAlongMiddle,
    extractFlaskFromLayers,
    detectColorsInFlasks,
    detectFlasks,
  };
}
