import "dotenv/config";
import { verifyKey, MessageComponentTypes, ButtonStyleTypes } from "discord-interactions";
import fetch from "node-fetch";

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf) {
    const signature = req.get("X-Signature-Ed25519");
    const timestamp = req.get("X-Signature-Timestamp");
    console.log(signature, timestamp, clientKey);

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      res.status(401).send("Bad request signature");
      throw new Error("Bad request signature");
    }
  };
}

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v10/" + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent": "SchzBot (https://github.com/fadhlanmr/schz-bot, 1.0.0)",
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGuildCommands(appId, guildId, commands) {
  // API endpoint to overwrite
  // ONLY GUILD
  // https://discord.com/developers/docs/interactions/application-commands#edit-guild-application-command
  const endpoint = `/applications/${appId}/guilds/${guildId}/commands`;

  try {
    await DiscordRequest(endpoint, { method: "PUT", body: commands });
    console.log("[COMMAND]-guild done register, ", endpoint);
  } catch (err) {
    console.error(err);
  }
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `/applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: "PUT", body: commands });
    console.log("[COMMAND]-global done register, ", endpoint);
  } catch (err) {
    console.error(err);
  }
}

// discord embed and component hard limits
const EMBED_TOTAL_LIMIT = 6000;
const EMBED_TITLE_LIMIT = 256;
const EMBED_FOOTER_LIMIT = 2048;
const FIELD_LIMIT = 25;
const FIELD_NAME_LIMIT = 256;
const FIELD_VALUE_LIMIT = 1024;
const SELECT_OPTION_LIMIT = 25;
const SELECT_LABEL_LIMIT = 100;
const SELECT_DESC_LIMIT = 100;
const CUSTOM_QUERY_LIMIT = 40;
const BODY_LIMIT_SINGLE = 3500;
const BODY_LIMIT_MIN = 120;
const ENTRY_GAP = 4;
const REPLY_LIMITS = [2, 5, 10, 25];

function truncateText(text, limit) {
  if (!text || limit <= 0) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

function onelineText(text) {
  return htmlclean(text || "").replace(/\n/g, " ");
}

function threadLabel(item) {
  return item.title ? `${htmlclean(item.title)} - ${item.thread}` : `${item.thread}`;
}

function threadMeta(item) {
  return `${item.reply} interactions`;
}

function replyMeta(item) {
  return item.image ? `${item.image} \n${item.reply} mention(s)` : `${item.reply} mention(s)`;
}

// spread the field bodies over what is left of the 6000 char embed budget,
// more entries means shorter body, drop entry if even a small body does not fit
function fitListFields(entries) {
  entries = entries.slice(0, FIELD_LIMIT);
  let shown = entries.length;
  let bodyLimit = 0;
  while (shown > 0) {
    let used = 0;
    for (let index = 0; index < shown; index++) {
      used += entries[index].name.length + entries[index].meta.length + ENTRY_GAP;
    }
    bodyLimit = Math.floor((EMBED_TOTAL_LIMIT - used) / shown);
    if (bodyLimit >= BODY_LIMIT_MIN || shown === 1) break;
    shown--;
  }
  const embedArr = [];
  for (let index = 0; index < shown; index++) {
    let entry = entries[index];
    let valueLimit = Math.min(bodyLimit, FIELD_VALUE_LIMIT - entry.meta.length - ENTRY_GAP);
    let body = truncateText(htmlclean(entry.body), valueLimit);
    embedArr.push({
      name: truncateText(entry.name, FIELD_NAME_LIMIT),
      value: body ? `${body}\n${entry.meta}` : entry.meta,
    });
  }
  return { fields: embedArr, shown: shown };
}

export function createThreadEmbed(board, thread) {
  let date = new Date()
  let threadEmbed = {
    type: 'rich',
    title: truncateText(thread.name, EMBED_TITLE_LIMIT),
    color: 2067276,
    description: truncateText(htmlclean(thread.body), BODY_LIMIT_SINGLE),
    timestamp: date.toLocaleString,
    url: `https://boards.4channel.org/${board}/thread/${thread.thread}`,
    footer: {
      text: `${thread.reply} interactions`,
      icon_url: "https://s.4cdn.org/image/foundericon.gif"
    },
  };
  if (thread.image) {
    threadEmbed.image = { url: thread.image };
  }
  return threadEmbed;
}

function embedThreadList(resultThread, limit) {
  const entryList = [];
  resultThread.slice(0, limit).forEach((item) => {
    entryList.push({
      name: threadLabel(item),
      meta: threadMeta(item),
      body: item.body || "",
    });
  });
  return fitListFields(entryList);
}

export function createListThreadEmbed(board, threadData, limit) {
  let date = new Date()
  let threadCount = threadData.length;
  const listFields = embedThreadList(threadData, limit);
  let footerText = `${threadCount} Thread(s)`;
  if (listFields.shown < Math.min(threadData.length, limit)) {
    footerText = `showing ${listFields.shown} of ${Math.min(threadData.length, limit)} Thread(s), hit embed size limit`;
  }
  return {
    type: 'rich',
    title: `/${board}/ Thread`,
    color: 2067276,
    timestamp: date.toLocaleString,
    url: `https://boards.4channel.org/${board}`,
    footer: {
      text: truncateText(footerText, EMBED_FOOTER_LIMIT),
      icon_url: "https://s.4cdn.org/image/foundericon.gif"
    },
    fields: listFields.fields
  };
}

export function createReplyEmbed(replyData) {
  let date = new Date()
  let replyEmbed = {
    type: 'rich',
    title: `>>${replyData.id}`,
    color: 2067276,
    description: truncateText(htmlclean(replyData.body), BODY_LIMIT_SINGLE),
    timestamp: date.toLocaleString,
    url: replyData.url,
    footer: {
      text: `${replyData.reply} mentions`,
      icon_url: "https://s.4cdn.org/image/foundericon.gif"
    },
  };
  if (replyData.image) {
    replyEmbed.image = { url: replyData.image };
  }
  return replyEmbed;
}

function embedReplyList(resultReply, limit) {
  const entryList = [];
  resultReply.slice(0, limit).forEach((item) => {
    entryList.push({
      name: `>>${item.id}`,
      meta: replyMeta(item),
      body: item.body || "",
    });
  });
  return fitListFields(entryList);
}

export function createListReplyEmbed(board, thread, replyData, limit) {
  let date = new Date()
  let replyCount = replyData.length;
  const listFields = embedReplyList(replyData, limit);
  let footerText = `${replyCount} Replies`;
  if (listFields.shown < Math.min(replyData.length, limit)) {
    footerText = `showing ${listFields.shown} of ${Math.min(replyData.length, limit)} Replies, hit embed size limit`;
  }
  return {
    type: 'rich',
    title: `>>${thread} Replies`,
    color: 2067276,
    timestamp: date.toLocaleString,
    url: `https://boards.4channel.org/${board}/thread/${thread}`,
    footer: {
      text: truncateText(footerText, EMBED_FOOTER_LIMIT),
      icon_url: "https://s.4cdn.org/image/foundericon.gif"
    },
    fields: listFields.fields
  };
}

// message components, all interaction state lives in the custom id
// schz:<action>:<board>:<thread>:<mode>:<arg>
// mode l = top reply list, arg is the limit. mode s = search result, arg is the search word
export function parseCustomId(customId) {
  let parts = String(customId).split(":");
  let customData = {
    action: parts[1] || "",
    board: parts[2] || "",
    thread: "",
    mode: "l",
    arg: "",
    limit: 2,
    query: "",
  };
  if (customData.action === "th_reply") {
    customData.thread = parts[3] || "";
  }
  if (customData.action === "th_reply_list") {
    customData.limit = parseInt(parts[3]) || 2;
    customData.query = parts.slice(4).join(":");
    customData.arg = String(customData.limit);
  }
  if (customData.action.startsWith("rp_")) {
    customData.thread = parts[3] || "";
    customData.mode = parts[4] === "s" ? "s" : "l";
    customData.arg = parts.slice(5).join(":");
    if (customData.mode === "s") {
      customData.query = customData.arg;
    } else {
      customData.limit = parseInt(customData.arg) || 2;
      customData.arg = String(customData.limit);
    }
  }
  return customData;
}

function replyCustomId(action, board, thread, mode, arg) {
  return `schz:${action}:${board}:${thread}:${mode}:${String(arg).slice(0, CUSTOM_QUERY_LIMIT)}`;
}

function threadSelectRow(board, threadData, customId, placeholder) {
  let options = [];
  threadData.slice(0, SELECT_OPTION_LIMIT).forEach((item) => {
    options.push({
      label: truncateText(threadLabel(item), SELECT_LABEL_LIMIT),
      value: String(item.thread),
      description: truncateText(onelineText(item.body) || threadMeta(item), SELECT_DESC_LIMIT),
    });
  });
  return {
    type: MessageComponentTypes.ACTION_ROW,
    components: [{
      type: MessageComponentTypes.STRING_SELECT,
      custom_id: customId,
      placeholder: placeholder,
      options: options,
    }],
  };
}

// dropdown on a thread list to pick a thread to show
export function createThreadSelectRow(board, threadData) {
  return threadSelectRow(board, threadData, `schz:th_pick:${board}`, "show thread...");
}

// dropdown on a thread list to pick which thread to show the reply
export function createReplyThreadRow(board, threadData) {
  return threadSelectRow(board, threadData, `schz:rp_thread:${board}`, "reply which thread...");
}

// reply button on a single thread, thread is already known
export function createReplyButtonRow(board, thread) {
  return {
    type: MessageComponentTypes.ACTION_ROW,
    components: [{
      type: MessageComponentTypes.BUTTON,
      style: ButtonStyleTypes.PRIMARY,
      label: "Reply",
      custom_id: `schz:th_reply:${board}:${thread}`,
    }],
  };
}

// reply button on a thread list, thread is still unknown so the list goes along
export function createListReplyButtonRow(board, limit, query) {
  return {
    type: MessageComponentTypes.ACTION_ROW,
    components: [{
      type: MessageComponentTypes.BUTTON,
      style: ButtonStyleTypes.PRIMARY,
      label: "Reply",
      custom_id: `schz:th_reply_list:${board}:${limit}:${String(query).slice(0, CUSTOM_QUERY_LIMIT)}`,
    }],
  };
}

// reply top / reply list choice, and how much reply to show
export function createReplyControlRows(board, thread, mode, arg) {
  let replyTop = {
    type: MessageComponentTypes.BUTTON,
    style: ButtonStyleTypes.PRIMARY,
    label: "Reply Top",
    custom_id: replyCustomId("rp_top", board, thread, mode, arg),
  };
  let replyList = {
    type: MessageComponentTypes.BUTTON,
    style: ButtonStyleTypes.SECONDARY,
    label: "Reply List",
    custom_id: replyCustomId("rp_list", board, thread, mode, arg),
  };
  const rowList = [{
    type: MessageComponentTypes.ACTION_ROW,
    components: [replyTop, replyList],
  }];
  // limit only means something for the top reply list, not for a search result
  if (mode === "l") {
    let limitOptions = [];
    REPLY_LIMITS.forEach((item) => {
      let option = {
        label: `${item} replies`,
        value: String(item),
      };
      if (String(item) === String(arg)) option.default = true;
      limitOptions.push(option);
    });
    rowList.push({
      type: MessageComponentTypes.ACTION_ROW,
      components: [{
        type: MessageComponentTypes.STRING_SELECT,
        custom_id: replyCustomId("rp_limit", board, thread, mode, arg),
        placeholder: "how many replies...",
        options: limitOptions,
      }],
    });
  }
  return rowList;
}

// dropdown on a reply list to pick a reply to show
export function createReplySelectRow(board, thread, mode, arg, replyData, selectedId) {
  let options = [];
  replyData.slice(0, SELECT_OPTION_LIMIT).forEach((item) => {
    let option = {
      label: truncateText(`>>${item.id}`, SELECT_LABEL_LIMIT),
      value: String(item.id),
      description: truncateText(onelineText(item.body) || `${item.reply} mention(s)`, SELECT_DESC_LIMIT),
    };
    if (String(item.id) === String(selectedId)) option.default = true;
    options.push(option);
  });
  return {
    type: MessageComponentTypes.ACTION_ROW,
    components: [{
      type: MessageComponentTypes.STRING_SELECT,
      custom_id: replyCustomId("rp_pick", board, thread, mode, arg),
      placeholder: "show reply...",
      options: options,
    }],
  };
}

export function errorInput(returnFunction, typeSend) {
  if (returnFunction instanceof String) {
    return {
      type: typeSend,
      data: {content:`${returnFunction}`},
    };
  }
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function htmlclean(escapedHTML) {
  return String(escapedHTML || "")
    .replace(/<br>/g, "\n")
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}
