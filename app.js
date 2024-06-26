import 'dotenv/config';
import express from 'express';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import {
  VerifyDiscordRequest,
  createThreadEmbed,
  createListThreadEmbed,
  createReplyEmbed
} from './utils.js';
import { 
  getTopThread, 
  getListThread, 
  getTopReply 
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
    const { name } = data;

    if (name === 'thread'){
      const board = data.options[0];
      const selectThread = await getTopThread(board.value);
      const threadEmbed = createThreadEmbed(board.value, selectThread);
      let threadPayloadData = {
        embeds: [threadEmbed],
        // content: `this shit stupid`,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectThread.name}`},
        data: threadPayloadData,
      });
    }

    if (name === 'threads'){
      const board = data.options[0];
      const limit = data.options[1] || {value: 1};
      const selectThread = await getListThread(board.value);
      const threadListEmbed = createListThreadEmbed(board.value, selectThread, limit.value);
      let threadListPayloadData = {
        embeds: [threadListEmbed],
        // content: `this shit stupid`,
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectThread.name}`},
        data: threadListPayloadData,
      });
    }

    if (name === 'reply'){
      const board = data.options[0];
      const thread = data.options[1];
      const selectReply = await getTopReply(board.value, thread.value);
      const replyEmbed = createReplyEmbed(selectReply);
      let replyPayloadData = {
        embeds: [replyEmbed],
      };
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        // data: {content:`${selectReply.name}`},
        data: replyPayloadData,
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

function htmlclean(escapedHTML) {
  return escapedHTML
    .replace(/<br>/g, " ")
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
};