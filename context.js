import { DiscordRequest } from "./utils.js";

const HISTORY_PAGE_LIMIT = 50;
const HISTORY_PAGES = 3;
const MESSAGE_LIMIT = 2000;
const STOP_WORDS = new Set((
  "a an the and or but if then so because as at by for from in into of on to with " +
  "i me my mine we us our you your yours he him his she her hers it its they them their " +
  "this that these those am is are was were be been being do does did doing have has had " +
  "can could will would should may might must not no yes just really very more most " +
  "what why how when where who which about also some any all each there here than too " +
  "im ive id ill youre youve youll hes shes its were dont doesnt didnt isnt arent " +
  "wasnt werent cant couldnt wont wouldnt shouldnt thats theres lets " +
  "like know think want need get got going go thing things something someone " +
  "lol lmao lmfao haha yeah yep nah okay ok hey bro dude please thanks"
).split(/\s+/));

function isChatMessage(message) {
  return [0, 19].includes(message.type) && message.content?.trim() &&
    !message.content.trim().startsWith("/");
}

function shapeMessage(message, focused) {
  return {
    id: message.id,
    author: String(message.author?.global_name || message.author?.username || "anon")
      .replace(/[\r\n]/g, " ").slice(0, 80),
    content: message.content.trim().slice(0, MESSAGE_LIMIT),
    focused: focused,
  };
}

// before is anchored to the interaction or picked message, never to the fetch time
export async function collectContext(interaction, count = 5, request = DiscordRequest) {
  if (!Number.isInteger(count) || count < 2 || count > 5) {
    throw new Error("chat count must be between 2 and 5");
  }
  const targetId = interaction.data.target_id;
  const target = targetId ? interaction.data.resolved?.messages?.[targetId] : null;
  if (targetId && (!target || !isChatMessage(target))) {
    throw new Error("pick a message with some text first");
  }
  const context = target ? [shapeMessage(target, true)] : [];
  let before = targetId || interaction.id;
  for (let page = 0; page < HISTORY_PAGES && context.length < count; page++) {
    let messages;
    try {
      const res = await request(
        `channels/${interaction.channel_id}/messages?before=${before}&limit=${HISTORY_PAGE_LIMIT}`,
        { method: "GET", signal: AbortSignal.timeout(5000) }
      );
      messages = await res.json();
    } catch (err) {
      // the picked message is supplied by Discord even if history is unavailable
      if (target) break;
      console.error("chat history fetch failed", err.message);
      throw new Error("could not read chat history, check View Channel, Read Message History and Message Content access");
    }
    if (!Array.isArray(messages)) throw new Error("could not read chat history");
    if (!messages.length) break;
    for (const message of messages) {
      if (BigInt(message.id) >= BigInt(before)) continue;
      if (message.author?.bot || message.webhook_id || !isChatMessage(message)) continue;
      context.push(shapeMessage(message, false));
      if (context.length === count) break;
    }
    const oldestId = messages[messages.length - 1].id;
    if (messages.length < HISTORY_PAGE_LIMIT || BigInt(oldestId) >= BigInt(before)) break;
    before = oldestId;
  }
  if (!context.length) {
    throw new Error("no readable chat before this command, check Message Content access or pick a text message");
  }
  context.sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
  if (!target) context[context.length - 1].focused = true;
  return context;
}

// shared word boundaries keep catalog matching from finding art inside party
export function topicWords(text) {
  return String(text || "").toLowerCase()
    .replace(/https?:\/\/\S+|<[@#][^>]+>/g, " ")
    .replace(/[’']/g, "")
    .match(/[\p{L}\p{N}]+/gu) || [];
}

export function getTopicKeywords(context) {
  const weights = new Map();
  context.forEach((message) => {
    const words = new Set(topicWords(message.content));
    words.forEach((word) => {
      if (word.length < 2 || /^\d+$/.test(word) || STOP_WORDS.has(word)) return;
      weights.set(word, (weights.get(word) || 0) + (message.focused ? 6 : 1));
    });
  });
  return [...weights].map(([word, weight]) => ({ word, weight }))
    .sort((a, b) => b.weight - a.weight).slice(0, 12);
}
