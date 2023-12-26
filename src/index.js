import 'dotenv/config';
import { readFile } from 'fs/promises';
import { Markup, session, Telegraf } from 'telegraf';
import { configureImageAnalysisLoop } from './bot/image-analysis-loop.js';
import { markMessageForReplace, replaceLastMessage } from './bot/replace-messages.js';
import { configureSovlingLoop } from './bot/solving-loop.js';
import { HelpMessage } from './constants/help-message.const.js';
import { SolvingMethod } from './constants/solving-method.const.js';
import { analyzeImage } from './image-analyzer.js';

/**
 * Корневой модуль, отвечающий за создание и работу телеграм бота
 */

console.log('creating bot');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

/**
 * Обработка команды /start
 */
bot.start(async (ctx) => {
  await ctx.sendMessage('Привет!');
  return ctx.sendMessage('Рекомендую изучить полную справку, введя команду /help');
});

/**
 * Обработка команды /help, отправка справки
 */
bot.help(async (ctx) => {
  await ctx.replyWithMarkdownV2(HelpMessage);
  return ctx.replyWithPhoto(
    { source: await readFile('./assets/puzzle_example.jpg') },
    { caption: 'Пример игры' },
  );
});

configureImageAnalysisLoop(bot);

/**
 * Обработка выбора пользователем закончить цикл вопросов о том, какие пятна
 * являются слоями в колбах, и перейти к поиску решения
 */
bot.action('start_solving', async (ctx) => {
  delete ctx.session.waitingForNumbers;

  markMessageForReplace(ctx, await replaceLastMessage(ctx, 'Формирую колбочки 🤓'));

  const [ layersMatrix, buffer, colors, imageData ] = analyzeImage(
    ctx.session.shape,
    ctx.session.pixels,
    ctx.session.spots,
    ctx.session.mask,
    ctx.session.spotsIndices,
  );

  delete ctx.session.shape;
  delete ctx.session.pixels;
  delete ctx.session.spots;
  delete ctx.session.mask;
  delete ctx.session.runNumber;
  delete ctx.session.spotsIndices;

  ctx.session = {
    ...ctx.session,
    colors,
    layersMatrix,
    imageData,
  };

  await replaceLastMessage(
    ctx,
    { source: buffer },
    { caption: 'Получились такие колбочки 🙂' },
  );

  markMessageForReplace(
    ctx,
    await ctx.reply(
      'Искать самое быстрое решение (найдётся быстро, может состоять из большого количества ' +
      'ходов), самое короткое решение (требует много времени на поиск, состоит из наименьшего ' +
      'количества ходов) или балансное решение (найдётся сопоставимо быстро с быстрым или ' +
      'быстрее, состоит из почти наименьшего или наименьшего количества ходов)?',
      Markup.inlineKeyboard([
        [ Markup.button.callback('Самое быстрое', `solve_${SolvingMethod.Fastest}`) ],
        [ Markup.button.callback('Самое короткое', `solve_${SolvingMethod.Shortest}`) ],
        [ Markup.button.callback('Балансное', `solve_${SolvingMethod.Balanced}`) ],
        [ Markup.button.callback('Не искать решение', 'cancel') ],
      ]),
      { one_time_keyboard: true },
    ),
  );
});

configureSovlingLoop(bot);

/**
 * Обработка инициированной пользователем отмены
 */
bot.action('cancel', (ctx) => {
  delete ctx.session?.layersMatrix;
  delete ctx.session?.colors;
  delete ctx.session?.imageData;
  return replaceLastMessage(ctx, 'До встречи!');
});

bot.catch((err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

bot.launch();

console.log('bot started');

process.once('SIGINT', async () => {
  await bot.stop('SIGINT');
  process.exit();
});
process.once('SIGTERM', async () => {
  await bot.stop('SIGTERM');
  process.exit();
});
