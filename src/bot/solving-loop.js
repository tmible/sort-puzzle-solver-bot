import { Worker } from 'worker_threads';
import { Markup } from 'telegraf';
import { CleanUpTimeout } from './constants/clean-up-timeout.const.js';
import { SolvingMethod } from '../constants/solving-method.const.js';
import { markMessageForReplace, replaceLastMessage } from './replace-messages.js';
import { pluralPipe } from '../utils.js';
import { visualizeSolution } from '../visualizer.js';

/**
 * Часть функциональности бота, обеспечивающая опрос пользователя
 * по поиску решения и инициацию поиска решения
 */

/**
 * Основной текст сообщения с индикацией
 * @constant {string}
 */
const LiveMessageText = 'Ищу решение 🤔\nЭто может занять некоторе время';

/**
 * Максимальное количество точек в сообщении с индикацией
 * @constant {number}
 */
const MaxPointsNumber = 26;

/**
 * Интервал обновления сообщения с индикацией
 * @constant {number}
 */
const LiveMessageUpdateInterval = 500;

/**
 * Отправка сообщения с индикацией процесса поиска решения в виде точек
 * @param {Context} ctx контекст из Telegraf
 * @returns {number} intervalID
 */
const sendLiveMessage = async (ctx) => {
  const liveMessage = await replaceLastMessage(ctx, LiveMessageText);
  markMessageForReplace(ctx, liveMessage);

  let pointsNumber = 0;
  const incrementPointsNumber = () => {
    pointsNumber = pointsNumber === MaxPointsNumber ? 1 : pointsNumber + 1;
    return pointsNumber;
  };

  const liveMessageUpdateInterval = setInterval(async () => {
    await ctx.telegram.editMessageText(
      liveMessage.chat.id,
      liveMessage.message_id,
      undefined,
      `${LiveMessageText}\n${new Array(incrementPointsNumber()).fill('.').join(' ')}`,
    );
  }, LiveMessageUpdateInterval);

  return liveMessageUpdateInterval;
};

/**
 * Инициация поиска решения
 * @param {Context} ctx контекст из Telegraf
 * @return {Promise<[ [ number, number ][], number ]>} найденное решение: массив пар номеров колб
 * для переливаний и необходимое количество пустых колб
 */
const initiateSolving = (ctx) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      './src/solver.js',
      {
        workerData: [
          ctx.session.layersMatrix,
          ctx.match[1],
        ],
      },
    );
    worker.on('message', resolve);
    worker.on('error', reject);
  });
};

/**
 * Отправка сообщения о том, что решение не найдено,
 * с возможностью инициации поиска решения другими методами
 * @param {Context} ctx контекст из Telegraf
 */
const sendSolutionNotFoundMessage = async (ctx) => {
  const message = await replaceLastMessage(
    ctx,
    'Не могу найти решение ☹️',
    Markup.inlineKeyboard(
      [
        [
          SolvingMethod.Fastest,
          Markup.button.callback(
            'Попробовать найти самое быстрое решение',
            `solve_${SolvingMethod.Fastest}_${ctx.match[2]}`,
          ),
        ],
        [
          SolvingMethod.Shortest,
          Markup.button.callback(
            'Попробовать найти самое короткое решение',
            `solve_${SolvingMethod.Shortest}_${ctx.match[2]}`,
          ),
        ],
        [
          SolvingMethod.Balanced,
          Markup.button.callback(
            'Попробовать найти балансное решение',
            `solve_${SolvingMethod.Balanced}_${ctx.match[2]}`,
          ),
        ],
        [
          'cancel',
          Markup.button.callback(
            'Не искать решение',
            'cancel',
          ),
        ],
      ].filter(([ key ]) => key !== ctx.match[1]).map(([ _, button ]) => [ button ]),
      { one_time_keyboard: true },
    ),
  );

  markMessageForReplace(ctx, message);

  setTimeout(async () => {
    try {
      await ctx.telegram.editMessageReplyMarkup(
        message.chat.id,
        message.message_id,
        undefined,
        Markup.removeKeyboard(),
      );
    } finally {}
  }, CleanUpTimeout);
};

/**
 * Отправка решения в формате текста
 * @param {Context} ctx контекст из Telegraf
 * @param {[ number, number ][]} solution массив пар номеров колб для переливаний
 * @param {number} requiredEmptyFlasksNumber необходимое количество пустых колб
 */
const sendTextSolution = (ctx, solution, requiredEmptyFlasksNumber) => {
  return replaceLastMessage(
    ctx,
    `Решение, использующее ${requiredEmptyFlasksNumber} ${
      pluralPipe(
        requiredEmptyFlasksNumber,
        [ 'пустую колбочку', 'пустые колбочки', 'пустых колбочек' ],
      )
    }:\n\`${
      solution.map((step) => step.map((flaskIndex) => flaskIndex + 1).join(' -> ')).join('\n')
    }\``,
    { parse_mode: 'MarkdownV2' },
  );
};

/**
 * Отправка решения в формате изображений
 * @param {Context} ctx контекст из Telegraf
 * @param {[ number, number ][]} solution массив пар номеров колб для переливаний
 * @param {number} requiredEmptyFlasksNumber необходимое количество пустых колб
 */
const sendVisualizedSolution = async (ctx, solution, requiredEmptyFlasksNumber) => {
  const mediaGroup = visualizeSolution(
    solution,
    [
      ...ctx.session.layersMatrix,
      ...new Array(requiredEmptyFlasksNumber).fill(null).map(() => []),
    ],
    ctx.session.colors,
    ctx.session.imageData,
    requiredEmptyFlasksNumber,
  ).map((buffer, i) => ({
    type: 'photo',
    media: { source: buffer },
  }));

  for (let i = 10; i < mediaGroup.length; i += 10) {
    await replaceLastMessage(ctx, mediaGroup.slice(i - 10, i));
  }
  return replaceLastMessage(
    ctx,
    mediaGroup.slice(-(mediaGroup.length % 10 === 0 ? 10 : mediaGroup.length % 10)),
  );
};

export const configureSovlingLoop = (bot) => {
  /**
   * Обработка выбора пользователем приоритета в поиске решения
   */
  bot.action(new RegExp(`^solve_(${Object.values(SolvingMethod).join('|')})$`), async (ctx) => {
    if (!ctx.session?.layersMatrix || !ctx.session.colors || !ctx.session?.imageData) {
      return;
    }

    markMessageForReplace(
      ctx,
      await replaceLastMessage(
        ctx,
        'Визуализировать каждый шаг решения или отправить его текстом?',
        Markup.inlineKeyboard(
          [
            [ Markup.button.callback('Визуализировать', `solve_${ctx.match[1]}_images`) ],
            [ Markup.button.callback('Текстом', `solve_${ctx.match[1]}_text`) ],
            [ Markup.button.callback('Не искать решение', 'cancel') ],
          ],
          { one_time_keyboard: true },
        ),
      ),
    );
  });

  /**
   * Обработка выбора пользователем формата получения решения,
   * запуск поиска решения с учётом выборов пользователя,
   * обработка ошибок при поиске и отправка найденного решения с учётом выборов пользователя
   */
  bot.action(
    new RegExp(`^solve_(${Object.values(SolvingMethod).join('|')})_(images|text)$`),
    async (ctx) => {
      if (!ctx.session?.layersMatrix || !ctx.session.colors || !ctx.session?.imageData) {
        return;
      }

      const liveMessageUpdateInterval = await sendLiveMessage(ctx);

      const [ solution, requiredEmptyFlasksNumber ] = await initiateSolving(ctx);

      clearInterval(liveMessageUpdateInterval);

      if (!solution) {
        return sendSolutionNotFoundMessage(ctx);
      }

      setTimeout(() => {
        delete ctx.session.layersMatrix;
        delete ctx.session.colors;
        delete ctx.session.imageData;
      });

      if (ctx.match[2] === 'images') {
        return sendVisualizedSolution(ctx, solution, requiredEmptyFlasksNumber);
      }

      return sendTextSolution(ctx, solution, requiredEmptyFlasksNumber);
    },
  );
};
