/* node:coverage disable */
import { strict as assert } from 'node:assert';
import { describe, it, mock } from 'node:test';
import { Markup } from 'telegraf';
import { MessageType } from '../constants/message-type.const.js';
import { markMessageForReplace, replaceLastMessage, forTesting } from '../replace-messages.js';

const { sendMessageByType, editMessageByType } = forTesting;

describe('replace-messages', () => {
  describe('markMessageForReplace', () => {
    it('should update session', () => {
      const startSession = {
        someSessionKey: 'value',
      };
      const ctx = {
        session: startSession,
      };
      const messageForReplace = { message_id: 'message_id', chat: { id: 'chatId' } };
      markMessageForReplace(ctx, messageForReplace);
      assert.deepEqual(
        ctx.session,
        {
          ...startSession,
          messageForReplace: {
            type: MessageType.Text,
            id: messageForReplace.message_id,
            chatId: messageForReplace.chat.id,
          },
        },
      );
    });

    it('should create session if there wasn\'t any', () => {
      const ctx = {};
      const messageForReplace = { message_id: 'message_id', chat: { id: 'chatId' } };
      markMessageForReplace(ctx, messageForReplace);
      assert.deepEqual(
        ctx.session,
        {
          messageForReplace: {
            type: MessageType.Text,
            id: messageForReplace.message_id,
            chatId: messageForReplace.chat.id,
          },
        },
      );
    });
  });

  describe('replaceLastMessage', () => {
    describe('should detect type', () => {
      describe('text', () => {
        it('for text messages without markup', async () => {
          const reply = mock.fn();
          await replaceLastMessage({ reply }, 'text message');
          assert.equal(reply.mock.calls.length > 0, true);
          mock.reset();
        });

        it('for text messages with markup', async () => {
          const reply = mock.fn();
          await replaceLastMessage({ reply }, 'text message', Markup.inlineKeyboard([]));
          assert.equal(reply.mock.calls.length > 0, true);
          mock.reset();
        });
      });

      describe('photo', () => {
        it('for photo messages', async () => {
          const replyWithMediaGroup = mock.fn();
          await replaceLastMessage(
            { replyWithMediaGroup },
            { source: 'source' },
            { caption: 'caption' },
          );
          assert.equal(replyWithMediaGroup.mock.calls.length > 0, true);
          mock.reset();
        });

        it('for mediaGroup messages', async () => {
          const replyWithMediaGroup = mock.fn();
          await replaceLastMessage(
            { replyWithMediaGroup },
            [{
              type: 'photo',
              media: { source: 'source' },
            }],
          );
          assert.equal(replyWithMediaGroup.mock.calls.length > 0, true);
          mock.reset();
        });
      });
    });

    it('should send new message if there is no marked for replace message', async () => {
      const reply = mock.fn();
      const message = 'text message';
      await replaceLastMessage({ session: {}, reply }, message);
      assert.deepEqual(reply.mock.calls[0]?.arguments, [ message ]);
      mock.reset();
    });

    it(
      'should edit message if there is marked for replace message and types are same',
      async () => {
        const editMessageText = mock.fn();
        const message = 'text message';
        await replaceLastMessage(
          {
            session: {
              messageForReplace: {
                type: MessageType.Text,
                id: 'messageId',
                chatId: 'chatId',
              },
            },
            telegram: { editMessageText },
          },
          message,
        );
        assert.deepEqual(
          editMessageText.mock.calls[0]?.arguments,
          [ 'chatId', 'messageId', undefined, message ],
        );
        mock.reset();
      },
    );

    it(
      'should delete message if there is marked for replace message and types are not same',
      async () => {
        const deleteMessage = mock.fn();
        const reply = mock.fn();
        await replaceLastMessage(
          {
            session: {
              messageForReplace: {
                type: MessageType.Photo,
                id: 'messageId',
                chatId: 'chatId',
              },
            },
            deleteMessage,
            reply,
          },
          'text message',
        );
        assert.deepEqual(deleteMessage.mock.calls[0]?.arguments, [ 'messageId' ]);
        mock.reset();
      },
    );

    it(
      'should send new message if there is marked for replace message and types are not same',
      async () => {
        const deleteMessage = mock.fn();
        const reply = mock.fn();
        const message = 'text message';
        await replaceLastMessage(
          {
            session: {
              messageForReplace: {
                type: MessageType.Photo,
                id: 'messageId',
                chatId: 'chatId',
              },
            },
            deleteMessage,
            reply,
          },
          message,
        );
        assert.deepEqual(reply.mock.calls[0]?.arguments, [ message ]);
        mock.reset();
      },
    );

    it('should delete marked for replace message from session', async () => {
      const editMessageText = mock.fn();
      const ctx = {
        session: {
          messageForReplace: {
            type: MessageType.Text,
            id: 'messageId',
            chatId: 'chatId',
          },
        },
        telegram: { editMessageText },
      };
      await replaceLastMessage(ctx, 'text message');
      assert.deepEqual(ctx.session, {});
      mock.reset();
    });

    it('should return sent or edited message', async () => {
      const returnValue = 'returnValue';
      const editMessageText = mock.fn(() => returnValue);
      const ctx = {
        session: {
          messageForReplace: {
            type: MessageType.Text,
            id: 'messageId',
            chatId: 'chatId',
          },
        },
        telegram: { editMessageText },
      };
      const editedMessage = await replaceLastMessage(ctx, 'text message');
      assert.equal(editedMessage, returnValue);
      mock.reset();
    });
  });

  describe('sendMessageByType', () => {
    it('should send text messages without markup', async () => {
      const reply = mock.fn();
      const ctx = { reply };
      const message = [ 'text message' ];
      await sendMessageByType(ctx, MessageType.Text, message);
      assert.deepEqual(reply.mock.calls[0]?.arguments, message);
      mock.reset();
    });

    it('should send text messages with markup', async () => {
      const reply = mock.fn();
      const ctx = { reply };
      const message = [ 'text message', Markup.inlineKeyboard([]) ];
      await sendMessageByType(ctx, MessageType.Text, message);
      assert.deepEqual(reply.mock.calls[0]?.arguments, message);
      mock.reset();
    });

    it('should send photo messages', async () => {
      const replyWithMediaGroup = mock.fn();
      const ctx = { replyWithMediaGroup };
      const message = [ { source: 'source' }, { caption: 'caption' } ];
      const sentMessage = await sendMessageByType(ctx, MessageType.Photo, message);
      assert.deepEqual(
        replyWithMediaGroup.mock.calls[0]?.arguments,
        [[{ type: 'photo', media: message[0], ...message[1] }]],
      );
      mock.reset();
    });

    it('should send mediaGroup messages', async () => {
      const replyWithMediaGroup = mock.fn();
      const ctx = { replyWithMediaGroup };
      const message = [[{ type: 'photo', source: 'source' }]];
      const sentMessage = await sendMessageByType(ctx, MessageType.Photo, message);
      assert.deepEqual(replyWithMediaGroup.mock.calls[0]?.arguments, message);
      mock.reset();
    });

    it('should send text messages when type is not defined', async () => {
      const reply = mock.fn();
      const ctx = { reply };
      const message = [ 'text message' ];
      await sendMessageByType(ctx, undefined, message);
      assert.deepEqual(reply.mock.calls[0]?.arguments, message);
      mock.reset();
    });

    it('should return sent message', async () => {
      const returnValue = 'returnValue';
      const reply = mock.fn(() => returnValue);
      const ctx = { reply };
      const sentMessage = await sendMessageByType(ctx, MessageType.Text, 'text message');
      assert.equal(sentMessage, returnValue);
      mock.reset();
    });
  });

  describe('editMessageByType', () => {
    it('should edit text messages without markup', async () => {
      const editMessageText = mock.fn();
      const messageForReplace = {
        id: 'messageId',
        chatId: 'chatId',
      };
      const ctx = {
        session: { messageForReplace },
        telegram: { editMessageText },
      };
      const message = [ 'text message' ];
      await editMessageByType(ctx, MessageType.Text, message);
      assert.deepEqual(
        editMessageText.mock.calls[0]?.arguments,
        [ messageForReplace.chatId, messageForReplace.id, undefined, ...message ],
      );
      mock.reset();
    });

    it('should edit text messages with markup', async () => {
      const editMessageText = mock.fn();
      const messageForReplace = {
        id: 'messageId',
        chatId: 'chatId',
      };
      const ctx = {
        session: { messageForReplace },
        telegram: { editMessageText },
      };
      const message = [ 'text message', Markup.inlineKeyboard([]) ];
      await editMessageByType(ctx, MessageType.Text, message);
      assert.deepEqual(
        editMessageText.mock.calls[0]?.arguments,
        [ messageForReplace.chatId, messageForReplace.id, undefined, ...message ],
      );
      mock.reset();
    });

    it('should edit photo messages media', async () => {
      const editMessageMedia = mock.fn();
      const editMessageCaption = mock.fn();
      const messageForReplace = {
        id: 'messageId',
        chatId: 'chatId',
      };
      const ctx = {
        session: { messageForReplace },
        telegram: { editMessageMedia, editMessageCaption },
      };
      const message = [ { source: 'source' }, { caption: 'caption' } ];
      await editMessageByType(ctx, MessageType.Photo, message);
      assert.deepEqual(
        editMessageMedia.mock.calls[0]?.arguments,
        [
          messageForReplace.chatId,
          messageForReplace.id,
          undefined,
          { type: 'photo', media: message[0] },
        ],
      );
      mock.reset();
    });

    it('should edit photo messages caption', async () => {
      const editMessageMedia = mock.fn();
      const editMessageCaption = mock.fn();
      const messageForReplace = {
        id: 'messageId',
        chatId: 'chatId',
      };
      const ctx = {
        session: { messageForReplace },
        telegram: { editMessageMedia, editMessageCaption },
      };
      const message = [ { source: 'source' }, { caption: 'caption' } ];
      await editMessageByType(ctx, MessageType.Photo, message);
      assert.deepEqual(
        editMessageCaption.mock.calls[0]?.arguments,
        [ messageForReplace.chatId, messageForReplace.id, undefined, message[1].caption ],
      );
      mock.reset();
    });

    it('should edit mediaGroup messages media', async () => {
      const editMessageMedia = mock.fn();
      const editMessageCaption = mock.fn();
      const messageForReplace = {
        id: 'messageId',
        chatId: 'chatId',
      };
      const ctx = {
        session: { messageForReplace },
        telegram: { editMessageMedia, editMessageCaption },
      };
      const message = [[{ type: 'photo', media: { source: 'source' }, caption: 'caption' }]];
      await editMessageByType(ctx, MessageType.Photo, message);
      assert.deepEqual(
        editMessageMedia.mock.calls[0]?.arguments,
        [ messageForReplace.chatId, messageForReplace.id, undefined, message[0] ],
      );
      mock.reset();
    });

    it('should edit mediaGroup messages caption', async () => {
      const editMessageMedia = mock.fn();
      const editMessageCaption = mock.fn();
      const messageForReplace = {
        id: 'messageId',
        chatId: 'chatId',
      };
      const ctx = {
        session: { messageForReplace },
        telegram: { editMessageMedia, editMessageCaption },
      };
      const message = [[{ type: 'photo', media: { source: 'source' }, caption: 'caption' }]];
      await editMessageByType(ctx, MessageType.Photo, message);
      assert.deepEqual(
        editMessageCaption.mock.calls[0]?.arguments,
        [ messageForReplace.chatId, messageForReplace.id, undefined, message[0][0].caption ],
      );
      mock.reset();
    });

    it('should edit text messages when type is not defined', async () => {
      const editMessageText = mock.fn();
      const messageForReplace = {
        id: 'messageId',
        chatId: 'chatId',
      };
      const ctx = {
        session: { messageForReplace },
        telegram: { editMessageText },
      };
      const message = [ 'text message' ];
      await editMessageByType(ctx, undefined, message);
      assert.deepEqual(
        editMessageText.mock.calls[0]?.arguments,
        [ messageForReplace.chatId, messageForReplace.id, undefined, ...message ],
      );
      mock.reset();
    });

    it('should return edited message', async () => {
      const returnValue = 'returnValue';
      const editMessageText = mock.fn(() => returnValue);
      const ctx = {
        session: {
          messageForReplace: {
            id: 'messageId',
            chatId: 'chatId',
          },
        },
        telegram: { editMessageText },
      };
      const editedMessage = await editMessageByType(ctx, MessageType.Text, 'text message');
      assert.equal(editedMessage, returnValue);
      mock.reset();
    });
  });
});
/* node:coverage enable */
