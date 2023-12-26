/* node:coverage disable */
import { FlaskCapacity } from '../../constants/flask-capacity.const.js';
import { NegativeFlask } from './negative-flask.js';
import { Puzzle } from '../../puzzle.js';

/**
 * Класс негативной игры (совокупности [негативных колб]{@link NegativeFlask})
 */
export class NegativePuzzle extends Puzzle {
  /**
   * Конструктор
   * @param {number[][]} [layersMatrix=[]] массив колб в виде массива цветных слоёв
   */
  constructor(layersMatrix = []) {
    super();
    this._flasks = layersMatrix.map((layers) => new NegativeFlask(layers));
  }

  /**
   * Создание копии игры
   * @public
   * @returns {NegativePuzzle} копия игры
   */
  copy() {
    return new NegativePuzzle(this._flasks.map((flask) => [ ...flask.layers ]));
  }

  /**
   * Проверка валидности переливания из одной негативной колбы в другую
   * @public
   * @param {number} sourceFlaskIndex индекс колбы, из которой переливают
   * @param {number} destinationFlaskIndex индекс колбы, в которую переливают
   * @param {number} transfusingLayersNumber количество переливаемых слоёв
   * @returns {boolean} признак валидности переливания
   */
  isTransfusionValid(sourceFlaskIndex, destinationFlaskIndex, transfusingLayersNumber) {
    if (
      sourceFlaskIndex < 0 ||
      sourceFlaskIndex >= this._flasks.length ||
      destinationFlaskIndex < 0 ||
      destinationFlaskIndex >= this._flasks.length
    ) {
      throw new Error('Flask index is out of bounds');
    }

    if (sourceFlaskIndex === destinationFlaskIndex) {
      return false;
    }

    return NegativeFlask.isTransfusionValid(
      this._flasks[sourceFlaskIndex],
      this._flasks[destinationFlaskIndex],
      transfusingLayersNumber,
    );
  }

  /**
   * Переливание из одной колбы в другую
   * @public
   * @param {number} sourceFlaskIndex индекс колбы, из которой переливают
   * @param {number} destinationFlaskIndex индекс колбы, в которую переливают
   * @param {number} transfusingLayersNumber количество переливаемых слоёв
   */
  transfuse(sourceFlaskIndex, destinationFlaskIndex, transfusingLayersNumber) {
    if (
      sourceFlaskIndex < 0 ||
      sourceFlaskIndex >= this._flasks.length ||
      destinationFlaskIndex < 0 ||
      destinationFlaskIndex >= this._flasks.length
    ) {
      throw new Error('flask index is out of bounds');
    }

    if (sourceFlaskIndex === destinationFlaskIndex) {
      return;
    }

    NegativeFlask.transfuse(
      this._flasks[sourceFlaskIndex],
      this._flasks[destinationFlaskIndex],
      transfusingLayersNumber,
    );
  }
}
/* node:coverage enable */
