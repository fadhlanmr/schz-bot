import { Hono } from "hono";
import { InteractionType, InteractionResponseType } from "discord-interactions";
import {
  createThreadEmbed,
  createListThreadEmbed,
  createReplyEmbed,
  createListReplyEmbed,
} from "./utils.js";
import { getThreads, getReply, searchThreads, searchReply } from "./4ch.js";
import { verifyKey } from "discord-interactions";
export const app = new Hono<{ Bindings: Cloudflare.Env }>();

// app.use("*", async (c, next) => {
//   const signature = c.req.header("x-signature-ed25519");
//   const timestamp = c.req.header("x-signature-timestamp");
//   console.log(signature, timestamp);
//
//   if (!signature || !timestamp) return c.text("Bad request", 400);
//
//   const body = await c.req.text();
//   const isValid = VerifyDiscordRequest(
//     body,
//     signature,
//     timestamp,
//     c.env.PUBLIC_KEY,
//   );
//
//   if (!isValid) return c.text("Unauthorized", 401);
//
//   c.set("body", body);
//   await next();
// });

app.get("/", (c) => {
  return c.text(`discord app ${c.env.APP_ID}`);
});

app.post("/interactions", async (c) => {
  const signature = c.req.header("x-signature-ed25519");
  const timestamp = c.req.header("x-signature-timestamp");
  const body = await c.req.text();
  const isValidRequest =
    signature &&
    timestamp &&
    (await verifyKey(body, signature, timestamp, c.env.PUBLIC_KEY));

  if (!isValidRequest) return c.json({ error: "request invalid" }, 400);

  const { type, data } = await JSON.parse(body);

  if (type === InteractionType.PING) {
    return c.json({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;
    let commandName = name;
    let subOptions = {};
    if (options) {
      commandName = name + " " + options[0].name;
      subOptions = options[0].options;
    }

    if (commandName === "thread top") {
      const board = subOptions[0];
      let isTop = 1;
      const selectThread = await getThreads(board.value, isTop);
      let threadEmbed = createThreadEmbed(board.value, selectThread);
      let threadPayloadData = {
        embeds: [threadEmbed],
      };
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: threadPayloadData,
      });
    }

    if (commandName === "thread list") {
      const board = subOptions[0];
      const limit = subOptions[1] || { value: 2 };
      const selectThread = await getThreads(board.value, limit.value);
      let threadEmbed = createListThreadEmbed(
        board.value,
        selectThread,
        limit.value,
      );
      let threadPayloadData = {
        embeds: [threadEmbed],
      };
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: threadPayloadData,
      });
    }

    if (commandName === "thread general") {
      const board = subOptions[0];
      const search = subOptions[1];
      let searchVal =
        search.value.startsWith("/") && search.value.endsWith("/")
          ? String(search.value).toLowerCase()
          : `/${String(search.value).toLowerCase()}/`;
      const selectSearch = await searchThreads(board.value, searchVal, true);
      if (!selectSearch) {
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `no such general, try thread search` },
        });
      }
      let searchEmbed = createThreadEmbed(board.value, selectSearch);
      let searchPayloadData = {
        embeds: [searchEmbed],
      };
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: searchPayloadData,
      });
    }

    if (commandName === "thread search") {
      const board = subOptions[0];
      const search = subOptions[1];
      const searchVal = String(search.value).toLowerCase();
      const selectSearch = await searchThreads(board.value, searchVal, false);
      if (!selectSearch) {
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `no such thread, try other word` },
        });
      }
      const searchLength = Array.isArray(selectSearch)
        ? selectSearch.length
        : 1;
      if (searchLength > 25) {
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `too broad, please be specific` },
        });
      }
      let searchEmbed = createListThreadEmbed(
        board.value,
        selectSearch,
        searchLength,
      );
      let searchPayloadData = {
        embeds: [searchEmbed],
      };
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: searchPayloadData,
      });
    }

    if (commandName === "reply top") {
      const board = subOptions[0];
      const thread = subOptions[1];
      let isTop = 1;
      const selectReply = await getReply(board.value, thread.value, isTop);
      let replyEmbed = createReplyEmbed(selectReply);
      let replyPayloadData = {
        embeds: [replyEmbed],
      };
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: replyPayloadData,
      });
    }

    if (commandName === "reply list") {
      const board = subOptions[0];
      const thread = subOptions[1];
      const limit = subOptions[2] || { value: 2 };
      const selectReply = await getReply(
        board.value,
        thread.value,
        limit.value,
      );
      let replyEmbed = createListReplyEmbed(
        board.value,
        thread.value,
        selectReply,
        limit.value,
      );
      let replyPayloadData = {
        embeds: [replyEmbed],
      };
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: replyPayloadData,
      });
    }

    if (commandName === "reply search") {
      const board = subOptions[0];
      const thread = subOptions[1];
      const search = subOptions[2];
      const searchVal = String(search.value).toLowerCase();
      const selectSearch = await searchReply(
        board.value,
        thread.value,
        searchVal,
      );
      if (!selectSearch) {
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `no such reply, try other word` },
        });
      }
      const searchLength = selectSearch.length;
      if (searchLength > 25) {
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `too broad, please be specific` },
        });
      }
      let searchEmbed = {};
      if (!searchLength) {
        searchEmbed = createReplyEmbed(selectSearch);
      } else {
        searchEmbed = createListReplyEmbed(
          board.value,
          thread.value,
          selectSearch,
          searchLength,
        );
      }
      let searchPayloadData = {
        embeds: [searchEmbed],
      };
      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: searchPayloadData,
      });
    }
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {
    const profile = "a";
    const profileEmbed = "b";
    return c.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [profileEmbed],
      },
    });
  }
});

export default {
  fetch: app.fetch,
};
