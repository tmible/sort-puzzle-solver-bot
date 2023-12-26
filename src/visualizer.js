import { createCanvas } from 'canvas';
import { SquareSide } from './constants/image-options/square-side.const.js';
import { FlasksMargin } from './constants/image-options/flasks-margin.const.js';
import { FlaskBorderWidth } from './constants/image-options/flask-border-width.const.js';
import { BackgroundColor } from './constants/image-options/background-color.const.js';
import { FlaskBorderColor } from './constants/image-options/flask-border-color.const.js';
import { FlaskCapacity } from './constants/flask-capacity.const.js';
import { Puzzle } from './puzzle.js';

/**
 * Модуль визуализации
 * Создаёт изображения игрового поля поодиночке или в составе найденного решения
 */

/**
 * Создание каркаса изображения: заливка фона и добавление колб
 * @param {number} rowsNumber количество рядов колб
 * @param {number[]} flasksInRows количество колб в каждом ряду
 * @returns {[ Canvas, CanvasRenderingContext2D ]} холст и его 2D-контекст для дальнейшего редактирования
 */
export const prepareImage = (rowsNumber, flasksInRows) => {
  const flasksInRow = Math.max(...flasksInRows);

  const canvas = createCanvas(
    flasksInRow * SquareSide +
      (flasksInRow + 1) * FlasksMargin +
      flasksInRow * 2 * FlaskBorderWidth,
    rowsNumber * FlaskCapacity * SquareSide +
      (rowsNumber + 1) * FlasksMargin +
      rowsNumber * FlaskBorderWidth,
  );

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = `rgb(${BackgroundColor})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = `rgb(${FlaskBorderColor})`;
  for (let i = 0; i < rowsNumber; ++i) {
    for (let j = 0; j < flasksInRows[i]; ++j) {

      ctx.fillRect(
        j * SquareSide + (j + 1) * FlasksMargin + j * 2 * FlaskBorderWidth,
        i * FlaskCapacity * SquareSide + (i + 1) * FlasksMargin + i * FlaskBorderWidth,
        FlaskBorderWidth,
        FlaskCapacity * SquareSide + FlaskBorderWidth,
      );

      ctx.fillRect(
        j * SquareSide +
          (j + 1) * FlasksMargin +
          j * 2 * FlaskBorderWidth +
          SquareSide + FlaskBorderWidth,
        i * FlaskCapacity * SquareSide + (i + 1) * FlasksMargin + i * FlaskBorderWidth,
        FlaskBorderWidth,
        FlaskCapacity * SquareSide + FlaskBorderWidth,
      );

      ctx.fillRect(
        j * SquareSide + (j + 1) * FlasksMargin + j * 2 * FlaskBorderWidth,
        i * FlaskCapacity * SquareSide +
          (i + 1) * FlasksMargin +
          i * FlaskBorderWidth +
          FlaskCapacity * SquareSide,
        SquareSide + 2 * FlaskBorderWidth,
        FlaskBorderWidth,
      );

    }
  }

  return [ canvas, ctx ];
};

/**
 * Заполнение изображения цветными слоями колб
 * @param {number} rowsNumber количество рядов колб
 * @param {number[]} flasksInRows количество колб в каждом ряду
 * @param {number[][]} layersMatrix матрица цветных слоёв колб
 * @param {string[]} colors байты RGB цветов, разделённые запятыми
 * @param {CanvasRenderingContext2D} ctx 2D-контекст холста
 */
export const fullfillImage = (rowsNumber, flasksInRows, layersMatrix, colors, ctx) => {
  let flaskIndex = 0;
  for (let i = 0; i < rowsNumber; ++i) {
    for (let j = 0; j < flasksInRows[i]; ++j, ++flaskIndex) {
      for (let layerIndex = 0; layerIndex < layersMatrix[flaskIndex].length; ++layerIndex) {

        ctx.fillStyle = `rgb(${colors[layersMatrix[flaskIndex][layerIndex]]})`;

        ctx.fillRect(
          j * SquareSide + (j + 1) * FlasksMargin + (j * 2 + 1) * FlaskBorderWidth,
          ((FlaskCapacity - layerIndex - 1) + FlaskCapacity * i) * SquareSide +
            (i + 1) * FlasksMargin +
            i * FlaskBorderWidth,
          SquareSide,
          SquareSide,
        );

      }
    }
  }
};

/**
 * Визуализация каждого шага решения с помощью {@link prepareImage} и {@link fullfillImage}
 * @param {number[][]} solution решение в виде массива пар номеров колб для [переливания]{@link Puzzle.transfuse}
 * @param {number[][]} layersMatrix игра в виде матрицы {@link Puzzle.layersMatrix}
 * @param {string[]} colors байты RGB цветов, разделённые запятыми
 * @param {{ rowsNumber: number, flasksInRows: number[] }} imageData количество рядов колб и количество колб в каждом ряду, распознанные на входном изображении
 * @param {number} requiredEmptyFlasksNumber количество пустых колб, используемых в решении
 * @returns {Buffer[]} визуализация каждого шага решения
 */
export const visualizeSolution = (
  solution,
  layersMatrix,
  colors,
  imageData,
  requiredEmptyFlasksNumber,
) => {
  imageData.flasksInRows[imageData.flasksInRows.length - 1] += requiredEmptyFlasksNumber;
  const puzzle = new Puzzle(layersMatrix);

  const [ canvas, ctx ] = prepareImage(imageData.rowsNumber, imageData.flasksInRows);
  fullfillImage(imageData.rowsNumber, imageData.flasksInRows, puzzle.layersMatrix, colors, ctx);

  const images = [ canvas.toBuffer() ];

  for (const [ i, j ] of solution) {
    puzzle.transfuse(i, j);

    const [ canvas, ctx ] = prepareImage(imageData.rowsNumber, imageData.flasksInRows);
    fullfillImage(imageData.rowsNumber, imageData.flasksInRows, puzzle.layersMatrix, colors, ctx);

    images.push(canvas.toBuffer());
  }

  return images;
};
