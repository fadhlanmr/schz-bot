import 'dotenv/config';
import express from 'express';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import {
  VerifyDiscordRequest,
  createThreadEmbed,
  createListThreadEmbed,
  createReplyEmbed,
  createListReplyEmbed,
  createThreadSelectRow,
  createReplyThreadRow,
  createReplyButtonRow,
  createListReplyButtonRow,
  createReplyControlRows,
  createReplySelectRow,
  parseCustomId
} from './utils.js';
import { 
  getThreads,
  getThread,
  getReply,
  getTopReply,
  getReplyById,
  searchThreads,
  searchReply
} from './4ch.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Log request bodies
  console.log(req.body);

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;
    let commandName = name;
    let subOptions = {}
    if (options){
      commandName = name + ' ' + options[0].name;
      subOptions = options[0].options;
    }
    if (commandName === 'thread top'){
      const board = subOptions[0];
      let isTop = 1;
      const selectThread = await getThreads(board.value, isTop);
      if (!selectThread) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`no thread there, or board is wrong`},
        });
      }
      let threadEmbed = createThreadEmbed(board.value, selectThread);
      let threadPayloadData = {
        embeds: [threadEmbed],
        components: [createReplyButtonRow(board.value, selectThread.thread)],
        // content: `this shit stupid`,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectThread.thread}`},
        data: threadPayloadData,
      });
    }

    if (commandName === 'thread list'){
      const board = subOptions[0];
      const limit = subOptions[1] || {value: 2};
      const selectThread = await getThreads(board.value, limit.value);
      if (!selectThread.length) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`no thread there, or board is wrong`},
        });
      }
      let threadEmbed = createListThreadEmbed(board.value, selectThread, limit.value);
      let threadPayloadData = {
        embeds: [threadEmbed],
        components: [
          createThreadSelectRow(board.value, selectThread),
          createListReplyButtonRow(board.value, limit.value, ""),
        ],
        // content: `this shit stupid`,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectThread.thread}`},
        data: threadPayloadData,
      });
    }

    if (commandName === 'thread general'){
      const board = subOptions[0];
      const search = subOptions[1];
      let searchVal = search.value.startsWith("/") && search.value.endsWith("/") ? String(search.value).toLowerCase() : `/${String(search.value).toLowerCase()}/`;
      const selectSearch = await searchThreads(board.value, searchVal, true);
      if (!selectSearch) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`no such general, try thread search`},
        });
      }
      let searchEmbed = createThreadEmbed(board.value, selectSearch)
      let searchPayloadData = {
        embeds: [searchEmbed],
        components: [createReplyButtonRow(board.value, selectSearch.thread)],
        // content: `this thing stupid`,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectThread.thread}`},
        data: searchPayloadData,
      });
    }

    if (commandName === 'thread search'){
      const board = subOptions[0];
      const search = subOptions[1];
      const searchVal = String(search.value).toLowerCase();
      const selectSearch = await searchThreads(board.value, searchVal, false);
      if (!selectSearch.length) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`no such thread, try other word`},
        });
      }
      const searchLength = selectSearch.length;
      if (searchLength > 25){
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`too broad, please be specific`},
        });
      }
      let searchEmbed = createListThreadEmbed(board.value, selectSearch, searchLength);
      let searchPayloadData = {
        embeds: [searchEmbed],
        components: [
          createThreadSelectRow(board.value, selectSearch),
          createListReplyButtonRow(board.value, searchLength, searchVal),
        ],
        // content: `this thing stupid`,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectThread.thread}`},
        data: searchPayloadData,
      });
    }


    if (commandName === 'reply top'){
      const board = subOptions[0];
      const thread = subOptions[1];
      const selectReply = await getTopReply(board.value, thread.value);
      if (!selectReply) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`no reply in that thread, or the thread is gone`},
        });
      }
      let replyEmbed = createReplyEmbed(selectReply);
      let replyPayloadData = {
        embeds: [replyEmbed],
        components: createReplyControlRows(board.value, thread.value, "l", 2),
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectReply.id}`},
        data: replyPayloadData,
      });
    }

    if (commandName === 'reply list'){
      const board = subOptions[0];
      const thread = subOptions[1];
      const limit = subOptions[2] || {value: 2};
      const selectReply = await getReply(board.value, thread.value, limit.value);
      if (!selectReply.length) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`no reply in that thread, or the thread is gone`},
        });
      }
      let replyEmbed = createListReplyEmbed(board.value, thread.value, selectReply, limit.value);
      let replyRows = createReplyControlRows(board.value, thread.value, "l", limit.value);
      replyRows.push(createReplySelectRow(board.value, thread.value, "l", limit.value, selectReply, 0));
      let replyPayloadData = {
        embeds: [replyEmbed],
        components: replyRows,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectReply.id}`},
        data: replyPayloadData,
      });
    }

    if (commandName === 'reply search'){
      const board = subOptions[0];
      const thread = subOptions[1];
      const search = subOptions[2];
      const searchVal = String(search.value).toLowerCase();
      const selectSearch = await searchReply(board.value, thread.value, searchVal);
      if (!selectSearch.length) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`no such reply, try other word`},
        });
      }
      // const errorInput = errorInput(selectSearch, InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
      // if (errorInput){
      //   return res.send(errorInput)
      // }
      const searchLength = selectSearch.length;
      if (searchLength > 25){
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`too broad, please be specific`},
        });
      }
      let searchEmbed = {}
      if (searchLength < 2) {searchEmbed = createReplyEmbed(selectSearch[0])}
      else {searchEmbed = createListReplyEmbed(board.value, thread.value, selectSearch, searchLength)};
      let searchRows = createReplyControlRows(board.value, thread.value, "s", searchVal);
      searchRows.push(createReplySelectRow(board.value, thread.value, "s", searchVal, selectSearch, 0));
      let searchPayloadData = {
        embeds: [searchEmbed],
        components: searchRows,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectReply.id}`},
        data: searchPayloadData,
      });
    }
  }
  
  // handle button and dropdown interaction
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const { custom_id, values } = data;
    const customData = parseCustomId(custom_id);
    const board = customData.board;
    const thread = customData.thread;
    console.log(customData);

    // dropdown on thread list, show the picked thread
    if (customData.action === 'th_pick') {
      const selectThread = await getThread(board, values[0]);
      if (!selectThread) {
        return updateMessage(res, {content:`thread not found, it may be archived`, embeds: [], components: []});
      }
      return updateMessage(res, {
        embeds: [createThreadEmbed(board, selectThread)],
        components: [createReplyButtonRow(board, selectThread.thread)],
      });
    }

    // reply button on single thread, show reply top / reply list choice
    if (customData.action === 'th_reply') {
      const selectThread = await getThread(board, thread);
      if (!selectThread) {
        return updateMessage(res, {content:`thread not found, it may be archived`, embeds: [], components: []});
      }
      return updateMessage(res, {
        embeds: [createThreadEmbed(board, selectThread)],
        components: createReplyControlRows(board, thread, "l", 2),
      });
    }

    // reply button on thread list, ask which thread to show the reply
    if (customData.action === 'th_reply_list') {
      const threadList = customData.query
        ? await searchThreads(board, customData.query, false)
        : await getThreads(board, customData.limit);
      if (!threadList.length) {
        return updateMessage(res, {content:`thread list is gone, try the command again`, embeds: [], components: []});
      }
      return updateMessage(res, {
        embeds: [createListThreadEmbed(board, threadList, threadList.length)],
        components: [
          createThreadSelectRow(board, threadList),
          createReplyThreadRow(board, threadList),
          createListReplyButtonRow(board, customData.limit, customData.query),
        ],
      });
    }

    // dropdown on thread list, show reply of the picked thread
    if (customData.action === 'rp_thread') {
      const selectThread = await getThread(board, values[0]);
      if (!selectThread) {
        return updateMessage(res, {content:`thread not found, it may be archived`, embeds: [], components: []});
      }
      return updateMessage(res, {
        embeds: [createThreadEmbed(board, selectThread)],
        components: createReplyControlRows(board, selectThread.thread, "l", 2),
      });
    }

    // reply top button
    if (customData.action === 'rp_top') {
      const selectReply = await getTopReply(board, thread);
      const replyList = await replyListFor(customData);
      if (!selectReply) {
        return updateMessage(res, {content:`no reply in >>${thread}, or the thread is gone`, embeds: [], components: []});
      }
      let replyRows = createReplyControlRows(board, thread, customData.mode, customData.arg);
      if (replyList.length) {
        replyRows.push(createReplySelectRow(board, thread, customData.mode, customData.arg, replyList, selectReply.id));
      }
      return updateMessage(res, {
        embeds: [createReplyEmbed(selectReply)],
        components: replyRows,
      });
    }

    // reply list button
    if (customData.action === 'rp_list') {
      const replyList = await replyListFor(customData);
      if (!replyList.length) {
        return updateMessage(res, {content:`no reply in >>${thread}, or the thread is gone`, embeds: [], components: []});
      }
      let replyRows = createReplyControlRows(board, thread, customData.mode, customData.arg);
      replyRows.push(createReplySelectRow(board, thread, customData.mode, customData.arg, replyList, 0));
      return updateMessage(res, {
        embeds: [createListReplyEmbed(board, thread, replyList, replyList.length)],
        components: replyRows,
      });
    }

    // how many replies dropdown
    if (customData.action === 'rp_limit') {
      const limit = parseInt(values[0]) || 2;
      const replyList = await getReply(board, thread, limit);
      if (!replyList.length) {
        return updateMessage(res, {content:`no reply in >>${thread}, or the thread is gone`, embeds: [], components: []});
      }
      let replyRows = createReplyControlRows(board, thread, "l", limit);
      replyRows.push(createReplySelectRow(board, thread, "l", limit, replyList, 0));
      return updateMessage(res, {
        embeds: [createListReplyEmbed(board, thread, replyList, replyList.length)],
        components: replyRows,
      });
    }

    // dropdown on reply list, show the picked reply
    if (customData.action === 'rp_pick') {
      const replyList = await replyListFor(customData);
      const selectReply = replyList.find((item) => String(item.id) === String(values[0]))
        || await getReplyById(board, thread, values[0]);
      if (!selectReply) {
        return updateMessage(res, {content:`reply not found, it may be deleted`, embeds: [], components: []});
      }
      let replyRows = createReplyControlRows(board, thread, customData.mode, customData.arg);
      if (replyList.length) {
        replyRows.push(createReplySelectRow(board, thread, customData.mode, customData.arg, replyList, selectReply.id));
      }
      return updateMessage(res, {
        embeds: [createReplyEmbed(selectReply)],
        components: replyRows,
      });
    }

    return updateMessage(res, {content:`unknown interaction`, embeds: [], components: []});
  }
});

// reply list source depends on where the interaction come from,
// the top reply list or a search result
async function replyListFor(customData) {
  if (customData.mode === 's') {
    return await searchReply(customData.board, customData.thread, customData.query);
  }
  return await getReply(customData.board, customData.thread, customData.limit);
}

// component interaction always edits the message the component is on
function updateMessage(res, payloadData) {
  return res.send({
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: payloadData,
  });
}

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});