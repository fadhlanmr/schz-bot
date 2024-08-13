import 'dotenv/config';
import express from 'express';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import {
  VerifyDiscordRequest,
  createThreadEmbed,
  createListThreadEmbed,
  createReplyEmbed,
  createListReplyEmbed
} from './utils.js';
import { 
  getThreads,
  getReply,
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
    if (options){
      const comName = name + ' ' + options[0].name;
      const subOption = options[0]
    }
    console.log(options[0].options, options[1].options);
    if (comName === 'thread top'){
      const board = data.options[0];
      let isTop = 1;
      const selectThread = await getThreads(board.value, isTop);
      let threadEmbed = createThreadEmbed(board.value, selectThread);
      let threadPayloadData = {
        embeds: [threadEmbed],
        // content: `this shit stupid`,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectThread.thread}`},
        data: threadPayloadData,
      });
    }

    if (name === 'thread list'){
      const board = data.options[0];
      const limit = data.options[1] || {value: 2};
      const selectThread = await getThreads(board.value, limit.value);
      let threadEmbed = createListThreadEmbed(board.value, selectThread, limit.value);
      let threadPayloadData = {
        embeds: [threadEmbed],
        // content: `this shit stupid`,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectThread.thread}`},
        data: threadPayloadData,
      });
    }

    if (name === 'reply top'){
      const board = data.options[0];
      const thread = data.options[1];
      let isTop = 1;
      const selectReply = await getReply(board.value, thread.value, isTop);
      let replyEmbed = replyEmbed = createReplyEmbed(selectReply);
      let replyPayloadData = {
        embeds: [replyEmbed],
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectReply.id}`},
        data: replyPayloadData,
      });
    }

    if (name === 'reply list'){
      const board = data.options[0];
      const thread = data.options[1];
      const limit = data.options[2] || {value: 2};
      const selectReply = await getReply(board.value, thread.value, limit.value);
      let replyEmbed = createListReplyEmbed(board.value, thread.value, selectReply, limit.value);
      let replyPayloadData = {
        embeds: [replyEmbed],
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectReply.id}`},
        data: replyPayloadData,
      });
    }

    if (name === 'search_thread'){
      const board = data.options[0];
      const search = data.options[1];
      const searchVal = String(search.value).toLowerCase();
      let isGeneral = false;
      if (searchVal.startsWith("/") && searchVal.endsWith("/")){isGeneral = true}
      const selectSearch = await searchThreads(board.value, search.value, isGeneral);
      if (selectSearch.length > 25){
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {content:`too broad, please be specific`},
        });
      }
      let searchEmbed = {}
      if (isGeneral) {searchEmbed = createThreadEmbed(board.value, selectSearch)}
      else {searchEmbed = createListThreadEmbed(board.value, selectSearch, selectSearch.length)};
      let searchPayloadData = {
        embeds: [searchEmbed],
        // content: `this thing stupid`,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectThread.thread}`},
        data: searchPayloadData,
      });
    }

    if (name === 'search_reply'){
      const board = data.options[0];
      const thread = data.options[1];
      const search = data.options[2];
      const searchVal = String(search.value).toLowerCase();
      const selectSearch = await searchReply(board.value, thread.value, searchVal);
      let searchEmbed = {}
      if (selectSearch.length<2) {searchEmbed = createReplyEmbed(selectSearch)}
      else {searchEmbed = createListReplyEmbed(board.value, thread.value, selectSearch, selectSearch.length)};
      let searchPayloadData = {
        embeds: [searchEmbed],
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectReply.id}`},
        data: searchPayloadData,
      });
    }
  }
  
  // handle button interaction
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const profile = "a";
    const profileEmbed = "b";
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [profileEmbed],
      },
    });
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});