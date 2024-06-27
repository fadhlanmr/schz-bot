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

function embedThreadList(board, res, limit) {
  const embedArr = [];
  for (let index = 0; index < limit; index++) {
    if (!res[index].title) {
      if (!res[index].body) {
        return {
          name: `${res[index].thread}`,
          value: `\n${res[index].reply} interactions \nhttps://boards.4chan.org/${board}/thread/${res[index].thread}`,
        };
      } else {
        return {
          name: `${htmlclean(res[index].body.substring(0, 400))} - ${res[index].thread}`,
          value: `\n${res[index].reply} interactions \nhttps://boards.4chan.org/${board}/thread/${res[index].thread}`,
        };
      }
    } else {
      if (!res[index].body) {
        return {
          name: `${res[index].title} - ${res[index].thread}`,
          value: `\n${res[index].reply} interactions \nhttps://boards.4chan.org/${board}/thread/${res[index].thread}`,
        };
      } else {
        return {
          name: `${res[index].title} - ${res[index].thread}`,
          value: `${htmlclean(res[index].body.substring(0, 400))}... \n\n${res[index].reply} interactions \nhttps://boards.4chan.org/${board}/thread/${res[index].thread}`,
        };
      }
    }
  }
  return embedArr;
}

export function createThreadEmbed(board, thread) {
  let date = new Date()
  return {
    type: 'rich',
    title: thread.name,
    color: 2067276,
    description: thread.value,
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

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function htmlclean(escapedHTML) {
  return escapedHTML
    .replace(/<br>/g, " ")
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}
