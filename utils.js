import "dotenv/config";
import { verifyKey } from "discord-interactions";
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

export async function InstallGlobalCommands(appId, guildId, commands) {
  // API endpoint to overwrite global commands
  // ONLY GUILD
  // https://discord.com/developers/docs/interactions/application-commands#edit-guild-application-command
  const endpoint = `/applications/${appId}/guilds/${guildId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: "PUT", body: commands });
    console.log("[COMMAND] done register, ", endpoint);
  } catch (err) {
    console.error(err);
  }
}

export function createThreadEmbed(board, thread) {
  let date = new Date()
  return {
    type: 'rich',
    title: thread.name,
    color: 2067276,
    description: thread.body,
    timestamp: date.toLocaleString,
    url: `https://boards.4channel.org/${board}/thread/${thread.thread}`,
    footer: {
      text: `${thread.reply} interactions`,
      icon_url: "https://s.4cdn.org/image/foundericon.gif"
    },
    image: {
      url: thread.image
    },
  };
}

function embedThreadList(resultThread, limit) {
  const embedArr = [];
  for (let index = 0; index < limit; index++) {
    let returnThread = {
      name: resultThread[index].thread,
      value: `${resultThread[index].reply} interactions\n`,
    }
    if (resultThread[index].title) {
      returnThread.name = `${htmlclean(resultThread[index].title)} - ${resultThread[index].thread}`
    }
    if (resultThread[index].body) {
      returnThread.value = `${htmlclean(resultThread[index].body.substring(0, 500))} \n${resultThread[index].reply} interactions\n\n`
    } 
    embedArr.push(returnThread);
  }
  return embedArr;
}

export function createListThreadEmbed(board, threadData, limit) {
  let date = new Date()
  let threadCount = threadData.length;
  return {
    type: 'rich',
    title: `/${board}/ Top Thread`,
    color: 2067276,
    timestamp: date.toLocaleString,
    url: `https://boards.4channel.org/${board}`,
    footer: {
      text: `${threadCount} Thread(s)`,
      icon_url: "https://s.4cdn.org/image/foundericon.gif"
    },
    fields: embedThreadList(threadData, limit)
  };
}

export function createReplyEmbed(replyData) {
  let date = new Date()
  return {
    type: 'rich',
    title: `>>${replyData.id}`,
    color: 2067276,
    description: htmlclean(replyData.body.substring(0, 1200)) || "",
    timestamp: date.toLocaleString,
    url: replyData.url,
    footer: {
      text: `${replyData.reply} mentions`,
      icon_url: "https://s.4cdn.org/image/foundericon.gif"
    },
    image: {
      url: replyData.image
    },
  };
}

function embedReplyList(resultReply, limit) {
  const embedArr = [];
  for (let index = 0; index < limit; index++) {
    let returnReply = {
      name: `>>${resultReply[index].id}`,
      value: `${resultReply[index].reply} mention(s)\n`,
    }
    if (resultReply[index].body) {
      returnReply.value = `${htmlclean(resultReply[index].body.substring(0, 500))} \n${resultReply[index].reply} mention(s)\n\n`
    } 
    if (resultReply[index].filename) {
      // fancy if-else inline
      returnReply.value = `${resultReply[index].body ? htmlclean(resultReply[index].body.substring(0, 500)) + ' \n' : ''}${resultReply[index].image} \n${resultReply[index].reply} mention(s)\n\n`
    }
    embedArr.push(returnReply);
  }
  return embedArr;
}

export function createListReplyEmbed(board, thread, replyData, limit) {
  let date = new Date()
  let replyCount = replyData.length;
  return {
    type: 'rich',
    title: `>>${thread} Top Replies`,
    color: 2067276,
    timestamp: date.toLocaleString,
    url: `https://boards.4channel.org/${board}/thread/${thread}`,
    footer: {
      text: `${replyCount} Replies`,
      icon_url: "https://s.4cdn.org/image/foundericon.gif"
    },
    fields: embedReplyList(replyData, limit)
  };
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function htmlclean(escapedHTML) {
  return escapedHTML
    .replace(/<br>/g, "\n")
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}
