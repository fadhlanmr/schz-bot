// Cache.js
import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 60, // 1 minute default TTL
  checkperiod: 120, // Check for expired keys every 2 minutes
});

// Api.js
import fetch from "node-fetch";

const API_TIMEOUT = 5000; // 5 second timeout
const MAX_RETRIES = 2;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function retryFetch(url, options = {}, retries = MAX_RETRIES) {
  try {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return retryFetch(url, options, retries - 1);
    }
    throw error;
  }
}

// Utils.js
function cleanHtml(text) {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#?\w+;/g, (match) => {
      const entities = {
        "&#039;": "'",
        "&lt;": "<",
        "&gt;": ">",
        "&amp;": "&",
        "&quot;": '"',
      };
      return entities[match] || match;
    });
}

function truncateText(text, length = 1200) {
  if (!text) return "";
  return cleanHtml(text).substring(0, length);
}

// 4chan.js
export async function getThreads(boardId, limit = 1) {
  console.time("threadSearch");
  const cacheKey = `threads_${boardId}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    console.timeEnd("threadSearch");
    return limit < 2 ? cachedData[0] : cachedData.slice(0, limit);
  }

  try {
    const data = await retryFetch(`https://a.4cdn.org/${boardId}/catalog.json`);

    const threads = data
      .flatMap((page) =>
        page.threads.map((thread) => ({
          thread: thread.no,
          name: thread.sub
            ? `${truncateText(thread.sub)} - ${thread.no}`
            : `${thread.no}`,
          body: truncateText(thread.com),
          reply: thread.replies,
          image: thread.tim
            ? `https://i.4cdn.org/${boardId}/${thread.tim}${thread.ext}`
            : "",
          url: `https://boards.4channel.org/${boardId}/thread/${thread.no}`,
        }))
      )
      .sort((a, b) => b.reply - a.reply);

    cache.set(cacheKey, threads);
    console.timeEnd("threadSearch");
    return limit < 2 ? threads[0] : threads.slice(0, limit);
  } catch (error) {
    console.timeEnd("threadSearch");
    console.error(`Error fetching threads for /${boardId}/:`, error);
    throw error;
  }
}

console.log(getThreads("vt", 10));

export async function getReply(boardId, threadId, limit = 1) {
  console.time("replySearch");
  const cacheKey = `replies_${boardId}_${threadId}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    console.timeEnd("replySearch");
    return limit < 2 ? cachedData[0] : cachedData.slice(0, limit);
  }

  try {
    const data = await retryFetch(
      `https://a.4cdn.org/${boardId}/thread/${threadId}.json`
    );

    const replies = new Map();
    const replyObjects = new Map();

    // First pass: Create reply objects and count mentions
    data.posts.forEach((post) => {
      const replyObj = {
        id: post.no,
        body: truncateText(post.com),
        time: post.time,
        reply: 0,
        image: post.tim
          ? `https://i.4cdn.org/${boardId}/${post.tim}${post.ext}`
          : "",
        url: `https://boards.4channel.org/${boardId}/thread/${threadId}#p${post.no}`,
      };

      replyObjects.set(post.no, replyObj);

      if (post.com) {
        const mentions = cleanHtml(post.com).match(/>>(\d+)/g) || [];
        mentions.forEach((mention) => {
          const mentionId = parseInt(mention.slice(2));
          if (mentionId > threadId) {
            replies.set(mentionId, (replies.get(mentionId) || 0) + 1);
          }
        });
      }
    });

    // Second pass: Update reply counts and sort
    const sortedReplies = [...replyObjects.values()]
      .map((reply) => ({
        ...reply,
        reply: replies.get(reply.id) || 0,
      }))
      .sort((a, b) => b.reply - a.reply)
      .slice(0, limit);

    cache.set(cacheKey, sortedReplies);
    console.timeEnd("replySearch");
    return limit < 2 ? sortedReplies[0] : sortedReplies;
  } catch (error) {
    console.timeEnd("replySearch");
    console.error(`Error fetching replies for /${boardId}/${threadId}:`, error);
    throw error;
  }
}

console.log(getReply("vt", 87079594, 10));
