import { FlaskCapacity } from './constants/flask-capacity.const.js';
import { Flask } from './flask.js';

/**
 * Класс игры (совокупности колб)
 */
export class Puzzle {
  /**
   * Колбы
   * @type {Flask[]}
   * @protacted
   */
  _flasks;

  /**
   * Конструктор
   * @param {number[][]} [layersMatrix=[]] массив колб в виде массива цветных слоёв
   */
  constructor(layersMatrix = []) {
    this._flasks = layersMatrix.map((layers) => new Flask(layers));
  }

  /**
   * Создание копии игры
   * @public
   * @returns {Puzzle} копия игры
   */
  copy() {
    return new Puzzle(this._flasks.map((flask) => [ ...flask.layers ]));
  }

  /**
   * Получение колб игры
   * @public
   * @returns {Flask[]} колбы
   */
  get flasks() {
    return this._flasks.map((flask) => flask.copy());
  }

  /**
   * Получение игры в виде матрицы
   * @public
   * @returns {number[][]} массив колб в виде массива цветных слоёв
   */
  get layersMatrix() {
    return this._flasks.map((flask) => [ ...flask.layers ]);
  }

  /**
   * Проверка решённости игры
   * Игра считается решённой, когда каждая колба либо пуста, либо заполнена,
   * при этом в каждой заполненной колбе все слои -- одного цвета
   * @public
   * @returns {boolean} признак решённости игры
   */
  get isSolved() {
    return !this._flasks.some((flask) => !flask.isInFinalState);
  }

  /**
   * Проверка валидности переливания из одной колбы в другую
   * @public
   * @param {number} sourceFlaskIndex индекс колбы, из которой переливают
   * @param {number} destinationFlaskIndex индекс колбы, в которую переливают
   * @returns {boolean} признак валидности переливания
   */
  isTransfusionValid(sourceFlaskIndex, destinationFlaskIndex) {
    if (
      sourceFlaskIndex < 0 ||
      sourceFlaskIndex >= this._flasks.length ||
      destinationFlaskIndex < 0 ||
      destinationFlaskIndex >= this._flasks.length
    ) {
      throw new Error('flask index is out of bounds');
    }

    if (sourceFlaskIndex === destinationFlaskIndex) {
      return false;
    }

    return Flask.isTransfusionValid(
      this._flasks[sourceFlaskIndex],
      this._flasks[destinationFlaskIndex],
    );
  }

  /**
   * Переливание из одной колбы в другую
   * @public
   * @param {number} sourceFlaskIndex индекс колбы, из которой переливают
   * @param {number} destinationFlaskIndex индекс колбы, в которую переливают
   */
  transfuse(sourceFlaskIndex, destinationFlaskIndex) {
    if (
      sourceFlaskIndex < 0 ||
      sourceFlaskIndex >= this._flasks.length ||
      destinationFlaskIndex < 0 ||
      destinationFlaskIndex >= this._flasks.length
    ) {
      throw new Error('flask index is out of bounds');
    }

    Flask.transfuse(
      this._flasks[sourceFlaskIndex],
      this._flasks[destinationFlaskIndex],
    );
  }

  /**
   * Преобразование к строке с предварительной сортировкой колб
   * @public
   * @returns {string} конкатенация колб [в строковом виде]{@link Flask.toString}
   */
  toStringWithSort() {
    return this._flasks.map((flask) => flask.toString()).sort().join('\n');
  }
}
