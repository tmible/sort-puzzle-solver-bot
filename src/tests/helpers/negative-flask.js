/* node:coverage disable */
import { FlaskCapacity } from '../../constants/flask-capacity.const.js';
import { Flask } from '../../flask.js';

/**
 * Класс негативной колбы
 * Негативная колба противоположна [обычной]{@link Flask}
 * в смысле правил валидности переливания и, как следствие,
 * в определении финального состояния
 * Класс нужен для генерации игр, наверняка имеющих решение,
 * путём запутывания решённой игры
 */
export class NegativeFlask extends Flask {
  /**
   * Создание копии колбы
   * @public
   * @returns {NegativeFlask} копия колбы
   */
  copy() {
    return new NegativeFlask(this._layers);
  }

  /**
   * Проверка, что в колба в финальном состоянии
   * Негативная колба считается колбой в финальном состоянии,
   * когда она либо пуста, либо заполнена
   * @public
   * @returns {boolean} признак того, что колба в финальном состоянии
   */
  get isInFinalState() {
    return this.isEmpty || this.isFull;
  }

  /**
   * Проверка валидности переливания из одной негативной колбы в другую
   * @public
   * @static
   * @param {NegativeFlask} sourceFlask колба, из которой переливают
   * @param {NegativeFlask} destinationFlask колба, в которую переливают
   * @param {number} transfusingLayersNumber количество переливаемых слоёв
   * @returns {boolean}
   */
  static isTransfusionValid(sourceFlask, destinationFlask, transfusingLayersNumber) {
    if (sourceFlask.isEmpty) {
      return false;
    }
    if (destinationFlask.isFull) {
      return false;
    }
    if (
      transfusingLayersNumber <= 0 ||
      transfusingLayersNumber > sourceFlask._layers.length ||
      transfusingLayersNumber > FlaskCapacity - destinationFlask._layers.length
    ) {
      return false;
    }
    if (
      sourceFlask._layers.length > transfusingLayersNumber &&
      sourceFlask._layers.at(-(transfusingLayersNumber + 1)) !==
        sourceFlask._layers.at(-transfusingLayersNumber)
    ) {
      return false;
    }
    return true;
  }

  /**
   * Переливание из одной негативной колбы в другую
   * @public
   * @static
   * @param {NegativeFlask} sourceFlask колба, из которой переливают
   * @param {NegativeFlask} destinationFlask колба, в которую переливают
   * @param {number} transfusingLayersNumber количество переливаемых слоёв
   */
  static transfuse(sourceFlask, destinationFlask, transfusingLayersNumber) {
    if (!NegativeFlask.isTransfusionValid(sourceFlask, destinationFlask, transfusingLayersNumber)) {
      throw new Error(
        `Transfusion of ${
          transfusingLayersNumber
        } layers from [${
          sourceFlask.toString()
        }] to [${
          destinationFlask.toString()
        }] is invalid`,
      );
    }

    for (let i = 0; i < transfusingLayersNumber; ++i) {
      destinationFlask._layers.push(sourceFlask._layers.pop());
    }
  }
}
/* node:coverage enable */
