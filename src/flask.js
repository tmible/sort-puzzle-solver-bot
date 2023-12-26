import { FlaskCapacity } from './constants/flask-capacity.const.js';

/**
 * Класс колбы
 */
export class Flask {
  /**
   * Цветные слои колбы
   * @type {number[]}
   * @protected
   */
  _layers;

  /**
   * Конструктор
   * @param {number[]} [layers=[]] цветные слои колбы
   */
  constructor(layers = []) {
    if (layers.length > FlaskCapacity) {
      throw new Error('Cannot fill flask over it\'s limit');
    }
    this._layers = [ ...layers ];
  }

  /**
   * Создание копии колбы
   * @public
   * @returns {Flask} копия колбы
   */
  copy() {
    return new Flask(this._layers);
  }

  /**
   * Получение содержимого колбы
   * @public
   * @returns {number[]} цветные слои колбы
   */
  get layers() {
    return [ ...this._layers ];
  }

  /**
   * Проверка пустоты колбы
   * @public
   * @returns {boolean} признак пустоты колбы
   */
  get isEmpty() {
    return this._layers.length === 0;
  }

  /**
   * Проверка заполненности колбы
   * @public
   * @returns {boolean} признак заполненности колбы
   */
  get isFull() {
    return this._layers.length === FlaskCapacity;
  }

  /**
   * Проверка, что в колба в финальном состоянии
   * Колба считается колбой в финальном состоянии, когда она либо пуста,
   * либо заполнена слоями одного цвета
   * @public
   * @returns {boolean} признак того, что колба в финальном состоянии
   */
  get isInFinalState() {
    return this.isEmpty || (
      this.isFull && this._layers.every((layer) => layer === this._layers[0])
    );
  }

  /**
   * Преобразование к строке
   * @public
   * @returns {string} конкатенация [цветных слоёв колбы]{@link _layers}
   */
  toString() {
    return this._layers.join(',');
  }

  /**
   * Проверка валидности переливания из одной колбы в другую
   * @public
   * @static
   * @param {Flask} sourceFlask колба, из которой переливают
   * @param {Flask} destinationFlask колба, в которую переливают
   * @returns {boolean}
   */
  static isTransfusionValid(sourceFlask, destinationFlask) {
    if (sourceFlask.isEmpty) {
      return false;
    }
    if (destinationFlask.isFull) {
      return false;
    }
    if (
      !destinationFlask.isEmpty &&
      sourceFlask._layers.at(-1) !== destinationFlask._layers.at(-1)
    ) {
      return false;
    }
    return true;
  }

  /**
   * Переливание из одной колбы в другую
   * @public
   * @static
   * @param {Flask} sourceFlask колба, из которой переливают
   * @param {Flask} destinationFlask колба, в которую переливают
   */
  static transfuse(sourceFlask, destinationFlask) {
    if (!Flask.isTransfusionValid(sourceFlask, destinationFlask)) {
      throw new Error(
        `Transfusion from [${
          sourceFlask.toString()
        }] to [${
          destinationFlask.toString()
        }] is invalid`,
      );
    }

    const avaliableCapacity = FlaskCapacity - destinationFlask._layers.length;

    let layersWithSameColor = 0;
    for (let i = sourceFlask._layers.length - 1; i >= 0; --i) {
      if (sourceFlask._layers[i] === sourceFlask._layers.at(-1)) {
        layersWithSameColor += 1;
      } else {
        break;
      }
    }

    for (let i = 0; i < Math.min(avaliableCapacity, layersWithSameColor); ++i) {
      destinationFlask._layers.push(sourceFlask._layers.pop());
    }
  }
}
