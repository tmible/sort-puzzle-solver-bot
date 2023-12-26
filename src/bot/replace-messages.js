import { MessageType } from './constants/message-type.const.js';
/**
 * Модуль для отправки новых сообщений с редактированием или удалением старых
 *
 * Информация об отправляемом текстовом сообщении
 * Содержит текст и, возможно, разметку клавиатуры
 * @typedef {[ string ] | [string, Markup<InlineKeyboardMarkup> ]} TextMessageToSend
 *
 * Информация об отправляемом сообщении с одним изображением
 * @typedef {[ InputMediaPhoto['media'], { caption: InputMediaPhoto['caption'] } ]} PhotoMessageToSend
 *
 * Информация об отправляемом сообщении с несколькими изображениями
 * @typedef {[ InputMediaPhoto[] ]} PhotosMessageToSend
 *
 * Информация об отправляемом сообщении
 * @typedef {TextMessageToSend | PhotoMessageToSend | PhotosMessageToSend} MessageToSend
 */

/**
 * Отметка отпрвленного сообщения к замене при отправке следующего
 * @param {Context} ctx контекст из Telegraf
 * @param {Message} messageForReplace отправленное сообщение
 */
export const markMessageForReplace = (ctx, messageForReplace) => {
  // тип вынесен в переменную, потому что возможно появление типа MessageType.Photo
  const type = MessageType.Text;
  ctx.session = {
    ...ctx.session,
    messageForReplace: {
      type,
      id: messageForReplace.message_id,
      chatId: messageForReplace.chat.id,
    },
  };
};

/**
 * Отправка сообщения с учётом его типа
 * @param {Context} ctx контекст из Telegraf
 * @param {MessageType} type тип сообщения
 * @param {MessageToSend} message сообщение
 * @returns {Promise<Message | Message[]>} отправленное сообщение или отправленные сообщения
 */
const sendMessageByType = async (ctx, type, message) => {
  let sentMessage;
  switch (type) {
    case MessageType.Photo:
      sentMessage = await ctx.replyWithMediaGroup(
        ...(Array.isArray(message[0]) ?
        message :
        [ [{ type: 'photo', media: message[0], ...message[1] }] ]
        ),
      );
      break;
    case MessageType.Text:
    default:
      sentMessage = await ctx.reply(...message);
      break;
  }
  return sentMessage;
};

/**
 * Редактирование старого сообщения с учётом его типа
 * @param {Context} ctx контекст из Telegraf
 * @param {MessageType} type тип сообщения
 * @param {MessageToSend} message сообщение
 * @returns {Promise<Message>} отредактированное сообщение
 */
const editMessageByType = async (ctx, type, message) => {
  const chatId = ctx.session.messageForReplace.chatId;
  const messageId = ctx.session.messageForReplace.id;
  let sentMessage;
  switch (type) {
    case MessageType.Photo:
      await ctx.telegram.editMessageMedia(
        chatId,
        messageId,
        undefined,
        Array.isArray(message[0]) ?
          message[0] :
          { type: 'photo', media: message[0] },
      );
      sentMessage = await ctx.telegram.editMessageCaption(
        chatId,
        messageId,
        undefined,
        Array.isArray(message[0]) ?
          message[0].find(({ caption }) => !!caption)?.caption :
          message[1].caption,
      );
      break;
    case MessageType.Text:
    default:
      sentMessage = await ctx.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        ...message,
      );
      break;
  }
  return sentMessage;
};

/**
 * Отправка сообщения взмен старого с автоматическим определением типа сообщения.
 * Если отмеченного к замене сообщения нет, новое сообщение просто [отправляется]{@link sendMessageByType};
 * Если отмеченное к замене сообщение есть и их типы совпадают, старое сообщение [редактируется]{@link editMessageByType}
 * Если отмеченное к замене сообщение есть и их типы не совпадают, старое сообщение удаляется, а новое [отправляется]{@link sendMessageByType}
 * @param {Context} ctx контекст из Telegraf
 * @param {MessageToSend} newMessage новое сообщение
 * @returns {Promise<Message | Messages[]>} отправленное сообщение или отправленные сообщения
 */
export const replaceLastMessage = async (ctx, ...newMessage) => {
  const type = typeof newMessage[0] === 'string' ? MessageType.Text : MessageType.Photo;
  let sentMessage;
  if (!ctx.session?.messageForReplace) {
    sentMessage = await sendMessageByType(ctx, type, newMessage);
  } else if (type === ctx.session?.messageForReplace.type) {
    sentMessage = await editMessageByType(ctx, type, newMessage);
  } else {
    await ctx.deleteMessage(ctx.session.messageForReplace.id);
    sentMessage = await sendMessageByType(ctx, type, newMessage);
  }
  delete ctx.session?.messageForReplace;
  return sentMessage;
};

export let forTesting;
if (!!process.env.NODE_TEST_CONTEXT) {
  forTesting = {
    sendMessageByType,
    editMessageByType,
  };
}
