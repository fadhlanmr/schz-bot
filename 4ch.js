import fetch from "node-fetch";
import { topicWords } from "./context.js";

export async function getThreads(boardParams, limitParams) {
  const threadList = [];

  try {
    const data = await fetchCatalog(boardParams);
    data.forEach((page) => {
      page.threads.forEach((item) => {
        const threadObj = {
          thread: item.no,
          title: item.sub,
          body: item.com,
          reply: item.replies,
          filename: item.filename,
          file: `${item.tim}${item.ext}`,
        };
        threadList.push(threadObj);
      });
    });
    threadList.sort((a, b) => b.reply - a.reply);
    console.log("--- threads sorted ---");

    if (!threadList.length) {
      return limitParams < 2 ? null : [];
    }
    if (limitParams<2) {
      return shapeThread(boardParams, threadList[0]);
    } else {
      return threadList;
    }
  } catch (err) {
    console.error(err);
    return limitParams < 2 ? null : [];
  }
}

// single thread by thread number, used when a thread is picked from a dropdown
export async function getThread(boardParams, threadParams) {
  try {
    const posts = await fetchThreadPosts(boardParams, threadParams);
    const op = posts[0];
    const threadObj = {
      thread: op.no,
      title: op.sub,
      body: op.com,
      reply: posts.length - 1,
      filename: op.filename,
      file: `${op.tim}${op.ext}`,
    };
    return shapeThread(boardParams, threadObj);
  } catch (err) {
    console.error(err);
    return null;
  }
}

// reply list sorted by mention count, always an array
export async function getReply(boardParams, threadParams, limitParams) {
  try {
    const posts = await fetchThreadPosts(boardParams, threadParams);
    const replyList = buildReplyList(boardParams, threadParams, posts);
    replyList.sort((a, b) => b.reply - a.reply);
    console.log("----- done sort map val -----");
    // thread can have less post than the limit
    return replyList.slice(0, Math.min(limitParams, replyList.length));
  } catch (err) {
    console.error(err);
    return [];
  }
}

// the most mentioned reply, single object
export async function getTopReply(boardParams, threadParams) {
  const replyList = await getReply(boardParams, threadParams, 1);
  return replyList[0] || null;
}

// single reply by post number, fallback when a picked reply is gone from the list
export async function getReplyById(boardParams, threadParams, replyParams) {
  try {
    const posts = await fetchThreadPosts(boardParams, threadParams);
    const replyList = buildReplyList(boardParams, threadParams, posts);
    const resultReply = replyList.find((item) => String(item.id) === String(replyParams));
    return resultReply || null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function searchThreads(boardParams, searchWord, isGeneral) {
  const threadList = [];

  try {
    const data = await fetchCatalog(boardParams);
    data.forEach((page) => {
      page.threads.forEach((item) => {
          const title = item.sub ? item.sub.toLowerCase() : "";
          const body = item.com ? item.com.toLowerCase() : "";
          let isMatch = title.includes(searchWord) || body.includes(searchWord);
          if (isGeneral){
              isMatch = title.includes(searchWord);
          }
          if (isMatch) {
              const threadObj = {
                  thread: item.no,
                  title: item.sub,
                  body: item.com,
                  reply: item.replies,
                  filename: item.filename,
                  file: `${item.tim}${item.ext}`,
              };
              threadList.push(threadObj);
          }
      });
    });

    if (!threadList.length) {
        return isGeneral ? null : [];
    }
    if (isGeneral) {
      return shapeThread(boardParams, threadList[0]);
    } else {
      return threadList;
    }
  } catch (err) {
    console.error(err);
    return isGeneral ? null : [];
  }
}

// reply list that match the search word, always an array
export async function searchReply(boardParams, threadParams, searchWord) {
  try {
    const posts = await fetchThreadPosts(boardParams, threadParams);
    const replyList = buildReplyList(boardParams, threadParams, posts);
    const searchList = replyList.filter((item) => {
      const body = item.body ? item.body.toLowerCase() : "";
      return body.includes(searchWord);
    });
    console.log("----- done check map val -----");
    // limit result to 20 if over
    return searchList.slice(0, 20);
  } catch (err) {
    console.error(err);
    return [];
  }
}

// accept one board or a comma-separated list, keep each board only once
export function parseBoards(boardParams) {
  const values = Array.isArray(boardParams) ? boardParams : String(boardParams || "").split(",");
  const boards = [...new Set(values.map((board) => String(board).trim().toLowerCase().replace(/^\/+|\/+$/g, "")))];
  if (!boards.length || boards.some((board) => !/^[a-z0-9]{1,10}$/.test(board))) {
    throw new Error("board should be a board name, like g or vip; separate multiple boards with commas");
  }
  if (boards.length > 3) throw new Error("choose 1 to 3 unique boards");
  return boards;
}

// count distinct hits first, context weight only breaks ties
function scoreWords(words, keywords) {
  let hits = 0;
  let weight = 0;
  keywords.forEach((item) => {
    if (words.has(item.word)) {
      hits++;
      weight += item.weight;
    }
  });
  return { hits: hits, weight: weight };
}

function replyText(body) {
  return htmlclean(body || "").replace(/>>\d+/g, "").trim();
}

// keep the previous weighted-random selection for the zero-hit fallback
function randomThread(matches) {
  const total = matches.reduce((sum, item) => sum + item.score, 0);
  let roll = Math.random() * total;
  for (const item of matches) {
    roll -= item.score;
    if (roll < 0) return item;
  }
  return matches[matches.length - 1];
}

// rank threads across all boards, then rank replies against the same chat keywords
export async function getContextReply(boardParams, keywords, request = fetch) {
  const boards = parseBoards(boardParams);
  const catalogs = await Promise.allSettled(boards.map((board) => fetchCatalog(board, request)));
  if (catalogs.every((result) => result.status === "rejected")) throw catalogs[0].reason;
  let matches = [];
  catalogs.forEach((result, index) => {
    const board = boards[index];
    if (result.status === "rejected") {
      console.error(`could not fetch /${board}/ catalog`, result.reason.message);
      return;
    }
    result.value.forEach((page) => {
      page.threads.forEach((thread) => {
        if (!thread.replies) return;
        const title = new Set(topicWords(htmlclean(thread.sub || "")));
        const body = new Set(topicWords(htmlclean(thread.com || "")));
        const score = scoreWords(new Set([...title, ...body]), keywords);
        const titleScore = scoreWords(title, keywords);
        const bodyScore = scoreWords(body, keywords);
        if (score.hits) matches.push({
          board: board,
          thread: thread.no,
          hits: score.hits,
          weight: score.weight,
          titleHits: titleScore.hits,
          score: titleScore.weight * 2 + bodyScore.weight,
        });
      });
    });
  });
  matches.sort((a, b) => b.hits - a.hits || b.weight - a.weight || b.titleHits - a.titleHits);

  // check up to three ranked threads per board before using a random fallback
  const attempts = new Map();
  const fallbacks = [];
  let lastError;
  while (matches.length) {
    const selected = matches.shift();
    const tried = (attempts.get(selected.board) || 0) + 1;
    attempts.set(selected.board, tried);
    if (tried === 3) matches = matches.filter((item) => item.board !== selected.board);
    let posts;
    try {
      posts = await fetchThreadPosts(selected.board, selected.thread, request);
    } catch (err) {
      if (err.status === 404) continue;
      lastError = err;
      matches = matches.filter((item) => item.board !== selected.board);
      continue;
    }
    const replies = buildReplyList(selected.board, selected.thread, posts)
      .filter((reply) => String(reply.id) !== String(selected.thread) && replyText(reply.body).length > 0);
    const rankedReplies = replies.map((reply) => ({
      reply: reply,
      ...scoreWords(new Set(topicWords(replyText(reply.body))), keywords),
    })).sort((a, b) => b.hits - a.hits || b.weight - a.weight || b.reply.reply - a.reply.reply);
    if (rankedReplies[0]?.hits > 0) return { ...rankedReplies[0].reply, board: selected.board };
    if (replies.length) fallbacks.push({ ...selected, replies: replies });
  }
  if (fallbacks.length) {
    const selected = randomThread(fallbacks);
    return { ...selected.replies[Math.floor(Math.random() * selected.replies.length)], board: selected.board };
  }
  if (lastError) throw lastError;
  return null;
}

// shape one catalog thread to the single thread embed shape
function shapeThread(boardParams, threadObj) {
  let returnThread = {
    thread: threadObj.thread,
    name: threadObj.thread,
    body: threadObj.body || "",
    reply: threadObj.reply,
    image: "",
  };
  if (threadObj.filename) {
    returnThread.image = `https://i.4cdn.org/${boardParams}/${threadObj.file}`;
  }
  if (threadObj.title) {
    returnThread.name = `${htmlclean(threadObj.title)} - ${threadObj.thread}`;
  }
  // body is kept raw, embed builder clean and cut it to the embed size limit
  return returnThread;
}

// count every mention (>>[number]) and set it to the mentioned reply
function buildReplyList(boardParams, threadParams, posts) {
  // map for reply check
  const idMap = new Map();
  const replyList = [];
  posts.forEach((post) => {
    let fullFilename = ""
    // something funny happen, because instead of checking typeof it's checking value null
    if (post.filename) {
      fullFilename = `${post.tim}${post.ext}`;
    }
    // set post.id.reply = 0
    idMap.set(post.no, 0);
    let tempReplyObj = {
      id: post.no,
      body: post.com,
      time: post.time,
      filename: post.filename,
      file: fullFilename,
      reply: 0,
      image: "",
      url: `https://boards.4chan.org/${boardParams}/thread/${threadParams}#p${post.no}`
    };
    // if reply has body / message
    if (tempReplyObj.body) {
      // check if post has mention (>>[number])
      if ((post = htmlclean(tempReplyObj.body).match(/>>(\d+)/))) {
        // parse string of mention
        let tempRes = parseInt(post[1]);
        // mentioned reply get +1 val in map
        if(tempRes > threadParams && Number.isInteger(idMap.get(tempRes)) ) {
            idMap.set(tempRes, idMap.get(tempRes) + 1);
        }
      }
    }
    replyList.push(tempReplyObj);
  });
  console.log("----- done check map val -----");
  // hand the map val back to every reply
  replyList.forEach((item) => {
    item.reply = idMap.get(item.id) || 0;
    if (item.file) {
      item.image = `https://i.4cdn.org/${boardParams}/${item.file}`;
    }
  });
  return replyList;
}

async function fetchCatalog(boardParams, request = fetch) {
  const endpoint = `https://a.4cdn.org/${boardParams}/catalog.json`;
  const res = await request(endpoint, {
    method: "GET",
    signal: AbortSignal.timeout(5000),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    console.log(res.status);
    // 4chan error body is not always json, so only the status is logged
    throw new Error(`4chan api error ${res.status}`);
  }
  return await res.json();
}

async function fetchThreadPosts(boardParams, threadParams, request = fetch) {
  const endpoint = `https://a.4cdn.org/${boardParams}/thread/${threadParams}.json`;
  const res = await request(endpoint, {
    method: "GET",
    signal: AbortSignal.timeout(5000),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    console.log(res.status);
    // 4chan error body is not always json, so only the status is logged
    const err = new Error(`4chan api error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.posts;
}

function htmlclean(escapedHTML) {
  return escapedHTML
    .replace(/<br>/g, `\n`)
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}
