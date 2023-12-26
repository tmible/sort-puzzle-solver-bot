import { Markup } from 'telegraf';
import { SpotsInRunNumber } from '../constants/spots-in-run-number.const.js';
import { detectSpots, markSpots } from '../image-analyzer.js';
import { markMessageForReplace, replaceLastMessage } from './replace-messages.js';
import { numbersAndRangesToNumbers } from '../utils.js';

/**
 * Часть функциональности бота, обеспечивающая получение изображений,
 * их анализ и опрос пользователя по ним
 */

/**
 * [Отмечает следующую партию пятен на изображении]{@link markSpots} и отправляет пользователю с вопросом
 * @param {Context} ctx контекст из Telegraf
 */
const markNextSpots = async (ctx) => {
  const buffer = markSpots(
    ctx.session.shape,
    ctx.session.pixels,
    ctx.session.spots,
    ctx.session.mask,
    ctx.session.runNumber,
  );

  await replaceLastMessage(
    ctx,
    { source: buffer },
    {
      caption: `Цветные пятна под какими номерами от ${
          ctx.session.runNumber * SpotsInRunNumber + 1
        } до ${
          (ctx.session.runNumber + 1) * SpotsInRunNumber
        } являются слоями в колбочках?`,
    },
  );

  ctx.session = { ...ctx.session, runNumber: ctx.session.runNumber + 1 };
};

/**
 * Шаблонная функция обработки изображения, которое может быть прислано и как изображение, и как документ
 * Получает изображение, переводит его в формат буфера, инициирует [определение на нём пятен]{@link detectSpots}
 * и запускает цикл вопросов к пользователю, какие пятна являются слоями в колбах {@link markNextSpots}
 * @param {boolean} isDocument признак того, что изображение получено документом (без сжатия)
 * @param {Context} ctx контекст из Telegraf
 * @param {() => Promise<void>} next функция вызова следующего обработчика
 */
const handleImage = async (isDocument, ctx, next) => {
  markMessageForReplace(
    ctx,
    await ctx.reply('Ищу на картинке колбочки 👀'),
  );

  const fileId = isDocument ?
  ctx.update.message.document.file_id :
  ctx.update.message.photo.at(-1).file_id;
  const imageUrl = await ctx.telegram.getFileLink(fileId);
  const imageBuffer = await fetch(imageUrl).then(async (res) => {
    return Buffer.from(await res.arrayBuffer());
  });

  const [ shape, pixels, spots, mask ] = await detectSpots(
    imageBuffer,
    ctx.update.message.document?.mime_type ?? undefined,
  );

  ctx.session = {
    ...ctx.session,
    shape,
    pixels,
    spots,
    mask,
    runNumber: 0,
  };

  await markNextSpots(ctx);

  ctx.session = { ...ctx.session, waitingForNumbers: true };

  return next();
};

export const configureImageAnalysisLoop = (bot) => {
  /**
   * Обработка получения изображения
   */
  bot.on('photo', async (ctx, next) => {
    return handleImage(false, ctx, next);
  });

  /**
   * Обработка получения документа
   */
  bot.on('document', async (ctx, next) => {
    if (ctx.update.message.document.mime_type.split('/')[0] !== 'image') {
      return next();
    }

    return handleImage(true, ctx, next);
  });

  /**
   * Обработка получения сообщения
   * Единственная опция обработки -- если был запущен цикл вопросов о том, какие пятна являются слоями в колбах.
   * В таком случае в ответ ожидается получить текст с цифрами и дефисами (остальные символы игнорируются).
   * Числа, окружающие дефис, интерпретируются как границы отрезка и дефис заменяется на все номера между границами.
   * Отмеченные пользователем номера сохраняются в сессии. Далее цикл вопросов можно продолжить или
   * завершить и перейти к поиску решения, нажав соответствющие кнопки
   */
  bot.on('message', async (ctx, next) => {
    if (ctx.session?.waitingForNumbers) {
      const numbers = numbersAndRangesToNumbers(ctx.update.message.text)?.map((index) => index - 1);
      if (!!numbers) {
        if (!ctx.session.spotsIndices) {
          ctx.session.spotsIndices = new Set();
        }
        numbers.forEach((number) => ctx.session.spotsIndices.add(number));
        markMessageForReplace(
          ctx,
          await ctx.reply(
            'Есть ещё?',
            Markup.inlineKeyboard([
              [ Markup.button.callback('Да', 'mark_spots') ],
              [ Markup.button.callback('Нет', 'start_solving') ],
            ]),
            { one_time_keyboard: true },
          ),
        );
      }
    }

    return next();
  });

  /**
   * Обработка выбора пользователем продолжить цикл вопросов о том, какие пятна являются слоями в колбах
   */
  bot.action('mark_spots', markNextSpots);
};
