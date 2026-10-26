import "dotenv/config";
import { collectContext, getTopicKeywords } from "./context.js";
import { getContextReply, parseBoards } from "./4ch.js";
import { generateSchizoResponse } from "./llm.js";
import { DiscordRequest, createReplyEmbed } from "./utils.js";

export function isSchizoCommand(data) {
  return (data.type === 1 && data.name === "schizo") ||
    (data.type === 3 && ["Schizo - LLM", "Schizo - Thread Reply"].includes(data.name));
}

// both entry points collect the same context before choosing a response source
export async function createSchizoResponse(interaction, services = {}) {
  const options = Object.fromEntries((interaction.data.options || []).map((item) => [item.name, item.value]));
  const mode = interaction.data.type === 3
    ? (interaction.data.name === "Schizo - LLM" ? "llm" : "thread")
    : (options.mode || "thread");
  if (!["llm", "thread"].includes(mode)) throw new Error("choose llm or thread mode");
  const boards = mode === "thread"
    ? parseBoards(options.boards || options.board || process.env.SCHIZO_BOARDS || process.env.SCHIZO_BOARD || "g")
    : [];
  const context = await (services.collectContext || collectContext)(interaction, options.count ?? 5);
  if (mode === "llm") {
    return { content: await (services.generateSchizoResponse || generateSchizoResponse)(context) };
  }
  const keywords = getTopicKeywords(context);
  if (!keywords.length) return { content: "not much of a topic there, try another bit of chat" };
  const reply = await (services.getContextReply || getContextReply)(boards, keywords);
  if (!reply) {
    const boardNames = boards.map((board) => `/${board}/`).join(", ");
    return { content: `no matching thread with a text reply on ${boardNames}, try another board or bit of chat` };
  }
  const replyEmbed = createReplyEmbed(reply);
  replyEmbed.title = `/${reply.board}/ >>${reply.id}`;
  return { embeds: [replyEmbed] };
}

// the interaction is already deferred; finish by editing its original response
export async function respondSchizo(interaction, services = {}) {
  let payloadData;
  try {
    payloadData = await createSchizoResponse(interaction, services);
  } catch (err) {
    console.error("schizo response failed", err.message);
    const content = err.name === "AbortError" || err.name === "TimeoutError"
      ? "response took too long, try again"
      : err.message;
    payloadData = { content: String(content || "could not get a response, try again").slice(0, 2000) };
  }
  return await (services.request || DiscordRequest)(
    `webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    {
      method: "PATCH",
      signal: AbortSignal.timeout(5000),
      body: {
        ...payloadData,
        allowed_mentions: { parse: [], replied_user: false },
      },
    }
  );
}
