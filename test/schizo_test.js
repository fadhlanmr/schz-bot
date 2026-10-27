// offline checks for chat context, response sources and deferred completion
import test from "node:test";
import assert from "node:assert/strict";
import { collectContext, getTopicKeywords } from "../context.js";
import { getContextReply, parseBoards } from "../4ch.js";
import { generateSchizoResponse } from "../llm.js";
import { isSchizoCommand, createSchizoResponse, respondSchizo } from "../schizo.js";

function message(id, content, extra = {}) {
  return {
    id: String(id),
    type: 0,
    content: content,
    author: { username: `anon${id}` },
    ...extra,
  };
}

function interaction(data = {}) {
  return {
    id: "1000",
    application_id: "123",
    channel_id: "456",
    token: "test-token",
    data: { type: 1, name: "schizo", ...data },
  };
}

function response(data, status = 200) {
  return { ok: status === 200, status: status, json: async () => data };
}

function setEnv(t, values) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });
}

const chat = [
  { id: "100", author: "one", content: "my linux audio is broken", focused: false },
  { id: "200", author: "two", content: "the speakers are haunted", focused: true },
];

test("recent context is bounded before invocation, filtered and chronological", async () => {
  const context = await collectContext(interaction(), 3, async (path, options) => {
    assert.equal(path, "channels/456/messages?before=1000&limit=50");
    assert.equal(options.method, "GET");
    assert.ok(options.signal);
    return response([
      message(1001, "posted after the command"),
      message(999, "bot", { author: { bot: true } }),
      message(998, "webhook", { webhook_id: "1" }),
      message(997, "   "),
      message(996, "/thread top g"),
      message(995, "command response", { type: 20 }),
      message(994, "newest reply", { type: 19 }),
      message(993, "middle"),
      message(992, "oldest"),
      message(991, "too old"),
    ]);
  });
  assert.deepEqual(context.map((item) => item.id), ["992", "993", "994"]);
  assert.deepEqual(context.map((item) => item.focused), [false, false, true]);
  assert.equal(context[0].author, "anon992");
});

test("targeted context ends at the selected message, including older targets", async () => {
  const picked = message(500, "linux speakers");
  const input = interaction({ type: 3, name: "Schizo - Thread Reply", target_id: "500", resolved: { messages: { "500": picked } } });
  const context = await collectContext(input, 3, async (path) => {
    assert.ok(path.includes("before=500"));
    return response([message(800, "later chat"), picked, message(499, "earlier"), message(498, "oldest")]);
  });
  assert.deepEqual(context.map((item) => item.id), ["498", "499", "500"]);
  assert.equal(context[2].focused, true);
});

test("history pagination finds human chat behind a page of bot messages", async () => {
  const paths = [];
  const context = await collectContext(interaction(), 2, async (path) => {
    paths.push(path);
    if (paths.length === 1) {
      return response(Array.from({ length: 50 }, (_, index) => message(999 - index, "bot", { author: { bot: true } })));
    }
    return response([message(949, "linux"), message(948, "audio")]);
  });
  assert.ok(paths[1].includes("before=950"));
  assert.deepEqual(context.map((item) => item.content), ["audio", "linux"]);
});

test("history scan is bounded and empty history gives a useful error", async () => {
  let calls = 0;
  await assert.rejects(collectContext(interaction(), 5, async () => {
    const start = 999 - calls++ * 50;
    return response(Array.from({ length: 50 }, (_, index) => message(start - index, "bot", { author: { bot: true } })));
  }), /no readable chat/);
  assert.equal(calls, 3);
});

test("selected message works alone if history is unavailable", async () => {
  const input = interaction({ target_id: "500", resolved: { messages: { "500": message(500, "haunted speakers") } } });
  const context = await collectContext(input, 5, async () => { throw new Error("403"); });
  assert.equal(context.length, 1);
  assert.equal(context[0].content, "haunted speakers");
  assert.equal(context[0].focused, true);
});

test("a short history is usable and long messages are bounded", async () => {
  const context = await collectContext(interaction(), 5, async () => response([message(900, "x".repeat(5000))]));
  assert.equal(context.length, 1);
  assert.equal(context[0].content.length, 2000);
});

test("invalid counts, image-only targets and inaccessible history fail clearly", async () => {
  await assert.rejects(collectContext(interaction(), 6), /between 2 and 5/);
  await assert.rejects(collectContext(interaction({ target_id: "500", resolved: { messages: { "500": message(500, "") } } })), /some text/);
  await assert.rejects(collectContext(interaction(), 2, async () => { throw new Error("403"); }), /Read Message History/);
});

test("topic matching prioritizes the main message and drops filler, URLs and mentions", () => {
  const keywords = getTopicKeywords([
    { content: "linux linux", focused: false },
    { content: "linux", focused: false },
    { content: "why are speakers haunted lol https://example.com/linux <@1234>", focused: true },
  ]);
  assert.equal(keywords[0].word, "speakers");
  assert.equal(keywords.find((item) => item.word === "linux").weight, 2);
  assert.equal(keywords.find((item) => item.word === "haunted").weight, 6);
  assert.ok(!keywords.some((item) => ["why", "are", "lol", "1234", "example"].includes(item.word)));
});

test("thread mode excludes OP, image-only, empty and reference-only posts", async (t) => {
  t.mock.method(Math, "random", () => 0);
  const reply = await getContextReply("g", [{ word: "linux", weight: 6 }], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [{ no: 100, sub: "Linux", replies: 5 }] }]);
    assert.equal(url, "https://a.4cdn.org/g/thread/100.json");
    return response({ posts: [
      { no: 100, com: "linux opening post" },
      { no: 101, filename: "image", tim: 123, ext: ".jpg" },
      { no: 102, com: "<br> " },
      { no: 103, com: '<a class="quotelink">&gt;&gt;100</a>' },
      { no: 104, com: "turn it off and back on" },
    ] });
  });
  assert.equal(reply.id, 104);
  assert.equal(reply.url, "https://boards.4chan.org/g/thread/100#p104");
});

test("random fallback can choose the last text reply when none has word hits", async (t) => {
  t.mock.method(Math, "random", () => 0.999);
  const reply = await getContextReply("g", [{ word: "audio", weight: 1 }], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [{ no: 100, com: "Audio", replies: 2 }] }]);
    return response({ posts: [{ no: 100, com: "OP" }, { no: 101, com: "first" }, { no: 102, com: "last" }] });
  });
  assert.equal(reply.id, 102);
});

test("context keyword weight breaks tied thread hit counts", async (t) => {
  t.mock.method(Math, "random", () => assert.fail("a matching reply should not use random selection"));
  const reply = await getContextReply("g", [{ word: "linux", weight: 1 }, { word: "audio", weight: 6 }], async (url) => {
    if (url.endsWith("catalog.json")) {
      return response([{ threads: [{ no: 100, com: "linux", replies: 1 }, { no: 200, sub: "Audio", replies: 1 }] }]);
    }
    assert.ok(url.includes("/200.json"));
    return response({ posts: [{ no: 200, com: "OP" }, { no: 201, com: "audio reply" }] });
  });
  assert.equal(reply.id, 201);
});

test("thread ranking favors distinct word hits over repetition and context weight", async (t) => {
  t.mock.method(Math, "random", () => assert.fail("ranked matches should not use randomness"));
  const reply = await getContextReply("g", [
    { word: "haunted", weight: 6 }, { word: "linux", weight: 1 }, { word: "audio", weight: 1 },
  ], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [
      { no: 100, sub: "haunted ".repeat(20), com: "haunted", replies: 1 },
      { no: 200, sub: "linux", com: "audio", replies: 1 },
    ] }]);
    assert.ok(url.endsWith("/200.json"));
    return response({ posts: [{ no: 200, com: "OP" }, { no: 201, com: "linux audio" }] });
  });
  assert.equal(reply.id, 201);
});

test("title hits break thread ties after distinct hits and context weight", async () => {
  const reply = await getContextReply("g", [{ word: "linux", weight: 1 }, { word: "audio", weight: 1 }], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [
      { no: 100, com: "linux audio", replies: 1 },
      { no: 200, sub: "linux", com: "audio", replies: 1 },
    ] }]);
    assert.ok(url.endsWith("/200.json"));
    return response({ posts: [{ no: 200, com: "OP" }, { no: 201, com: "linux" }] });
  });
  assert.equal(reply.id, 201);
});

test("reply ranking uses most distinct hits, cleaned HTML and whole words", async () => {
  const reply = await getContextReply("g", [
    { word: "haunted", weight: 6 }, { word: "linux", weight: 1 }, { word: "audio", weight: 1 },
  ], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [{ no: 100, sub: "linux audio haunted", replies: 4 }] }]);
    return response({ posts: [
      { no: 100, com: "linux audio haunted OP must not win" },
      { no: 101, com: "haunted ".repeat(30) },
      { no: 102, com: '<span class="quote">LINUX</span><br>audio &amp; noise' },
      { no: 103, com: '<a href="https://example.com/linux/audio">hauntedness linuxish audiophile</a>' },
      { no: 104, com: '&gt;&gt;102<br><a class="quotelink">&gt;&gt;100</a>' },
    ] });
  });
  assert.equal(reply.id, 102);
});

test("selected-message keyword weight breaks tied reply hit counts", async () => {
  const reply = await getContextReply("g", [{ word: "linux", weight: 1 }, { word: "haunted", weight: 6 }], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [{ no: 100, sub: "linux haunted", replies: 3 }] }]);
    return response({ posts: [
      { no: 100, com: "OP" },
      { no: 101, com: "linux" },
      { no: 102, com: "haunted" },
      { no: 103, com: "&gt;&gt;101" },
    ] });
  });
  assert.equal(reply.id, 102);
});

test("mention count breaks equal reply scores without rewarding repeated words", async () => {
  const reply = await getContextReply("g", [{ word: "linux", weight: 1 }], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [{ no: 100, sub: "linux", replies: 3 }] }]);
    return response({ posts: [
      { no: 100, com: "OP" },
      { no: 101, com: "linux ".repeat(30) },
      { no: 102, com: "linux" },
      { no: 103, com: "&gt;&gt;102" },
    ] });
  });
  assert.equal(reply.id, 102);
  assert.equal(reply.reply, 1);
});

test("zero-hit replies in the top thread yield to a hit in the next ranked thread", async (t) => {
  t.mock.method(Math, "random", () => assert.fail("a later matching reply should beat random fallback"));
  const paths = [];
  const reply = await getContextReply("g,vg", [{ word: "linux", weight: 1 }, { word: "audio", weight: 1 }], async (url) => {
    if (url.endsWith("/g/catalog.json")) return response([{ threads: [{ no: 100, sub: "linux audio", replies: 1 }] }]);
    if (url.endsWith("/vg/catalog.json")) return response([{ threads: [{ no: 200, sub: "linux", replies: 1 }] }]);
    paths.push(url);
    if (url.endsWith("/100.json")) return response({ posts: [{ no: 100, com: "OP" }, { no: 101, com: "buy a new computer" }] });
    return response({ posts: [{ no: 200, com: "OP" }, { no: 201, com: "linux drivers" }] });
  });
  assert.deepEqual(paths, ["https://a.4cdn.org/g/thread/100.json", "https://a.4cdn.org/vg/thread/200.json"]);
  assert.equal(reply.id, 201);
  assert.equal(reply.board, "vg");
});

test("the best matching reply comes from the highest-ranked usable thread first", async () => {
  const reply = await getContextReply("g", [{ word: "linux", weight: 1 }, { word: "audio", weight: 1 }], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [
      { no: 100, sub: "linux audio", replies: 1 },
      { no: 200, sub: "linux", replies: 1 },
    ] }]);
    assert.ok(url.endsWith("/100.json"));
    return response({ posts: [{ no: 100, com: "OP" }, { no: 101, com: "linux" }] });
  });
  assert.equal(reply.id, 101);
});

test("zero-hit fallback keeps weighted thread and uniform reply randomness without refetching", async (t) => {
  const rolls = [0.8, 0.999];
  t.mock.method(Math, "random", () => {
    assert.ok(rolls.length, "only fallback selection should use randomness");
    return rolls.shift();
  });
  const paths = [];
  const reply = await getContextReply("g,vg", [{ word: "linux", weight: 1 }, { word: "audio", weight: 6 }], async (url) => {
    paths.push(url);
    if (url.endsWith("catalog.json")) {
      return response([{ threads: [{ no: 100, sub: url.includes("/vg/") ? "audio" : "linux", replies: 2 }] }]);
    }
    return response({ posts: [{ no: 100, com: "OP" }, { no: 101, com: "first" }, { no: 102, com: "last" }] });
  });
  // /vg/ has 12/14 of the old weighted score, so a 0.8 roll still picks it
  assert.equal(reply.board, "vg");
  assert.equal(reply.id, 102);
  assert.equal(paths.length, 4);
  assert.equal(new Set(paths).size, 4);
  assert.equal(rolls.length, 0);
});

test("ranked lookup stays bounded and preserves a usable fallback after later errors", async (t) => {
  t.mock.method(Math, "random", () => 0);
  const paths = [];
  const reply = await getContextReply("g,vg", [{ word: "linux", weight: 1 }], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [100, 200, 300, 400].map((no) => ({ no: no, sub: "linux", replies: 1 })) }]);
    paths.push(url);
    if (url.includes("/vg/")) return response(null, 503);
    const no = Number(url.match(/\/(\d+)\.json$/)[1]);
    return response({ posts: [{ no: no, com: "OP" }, { no: no + 1, com: "fallback reply" }] });
  });
  assert.equal(paths.length, 4);
  assert.ok(!paths.some((path) => path.endsWith("/400.json")));
  assert.equal(reply.board, "g");
  assert.equal(reply.id, 101);
});

test("deleted and textless threads are skipped for another matching thread", async (t) => {
  t.mock.method(Math, "random", () => 0);
  const reply = await getContextReply("g", [{ word: "linux", weight: 1 }], async (url) => {
    if (url.endsWith("catalog.json")) {
      return response([{ threads: [100, 200, 300].map((no) => ({ no: no, sub: "linux", replies: 1 })) }]);
    }
    if (url.includes("/100.json")) return response(null, 404);
    if (url.includes("/200.json")) return response({ posts: [{ no: 200, com: "OP" }, { no: 201 }] });
    return response({ posts: [{ no: 300, com: "OP" }, { no: 301, com: "actual reply" }] });
  });
  assert.equal(reply.id, 301);
});

test("thread search uses word boundaries and returns null without a match", async () => {
  let calls = 0;
  const reply = await getContextReply("g", [{ word: "art", weight: 1 }], async () => {
    calls++;
    return response([{ threads: [{ no: 100, sub: "party", replies: 1 }, { no: 200, sub: "art", replies: 0 }] }]);
  });
  assert.equal(reply, null);
  assert.equal(calls, 1);
});

test("4chan service failures are distinct from no results", async () => {
  await assert.rejects(getContextReply("g", [{ word: "linux", weight: 1 }], async () => response(null, 503)), /4chan api error 503/);
  await assert.rejects(getContextReply("g", [{ word: "linux", weight: 1 }], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [{ no: 100, sub: "linux", replies: 1 }] }]);
    return response(null, 503);
  }), /4chan api error 503/);
});

test("board lists accept one to three boards and normalize duplicates", () => {
  assert.deepEqual(parseBoards("g"), ["g"]);
  assert.deepEqual(parseBoards(["g"]), ["g"]);
  assert.deepEqual(parseBoards(" /G/ , vg, /g/ "), ["g", "vg"]);
  assert.deepEqual(parseBoards("g,vg,v"), ["g", "vg", "v"]);
  assert.deepEqual(parseBoards("g,vg,v,g"), ["g", "vg", "v"]);
  for (const value of ["", [], "g,,vg", "g,../bad", "g,vg,v,vip"]) {
    assert.throws(() => parseBoards(value), /board/);
  }
});

test("single-board array returns the correct source board and link", async () => {
  const urls = [];
  const reply = await getContextReply(["g"], [{ word: "linux", weight: 1 }], async (url) => {
    urls.push(url);
    if (url.endsWith("catalog.json")) return response([{ threads: [{ no: 100, sub: "linux", replies: 1 }] }]);
    return response({ posts: [{ no: 100, com: "OP" }, { no: 101, com: "linux reply" }] });
  });
  assert.equal(urls.length, 2);
  assert.equal(reply.board, "g");
  assert.equal(reply.url, "https://boards.4chan.org/g/thread/100#p101");
});

test("multiple boards share one thread ranking and preserve board identity", async (t) => {
  t.mock.method(Math, "random", () => assert.fail("a matching reply should not use random selection"));
  const urls = [];
  const reply = await getContextReply("g,vg", [{ word: "linux", weight: 1 }, { word: "audio", weight: 6 }], async (url) => {
    urls.push(url);
    if (url.endsWith("catalog.json")) {
      return response([{ threads: [{ no: 100, sub: url.includes("/vg/") ? "audio" : "linux", replies: 1 }] }]);
    }
    assert.equal(url, "https://a.4cdn.org/vg/thread/100.json");
    return response({ posts: [{ no: 100, com: "OP" }, { no: 101, com: "audio reply", filename: "pic", tim: 123, ext: ".jpg" }] });
  });
  assert.ok(urls.includes("https://a.4cdn.org/g/catalog.json"));
  assert.ok(urls.includes("https://a.4cdn.org/vg/catalog.json"));
  assert.equal(reply.board, "vg");
  assert.equal(reply.url, "https://boards.4chan.org/vg/thread/100#p101");
  assert.equal(reply.image, "https://i.4cdn.org/vg/123.jpg");
});

test("duplicate board names fetch only one catalog", async () => {
  const urls = [];
  await getContextReply("g,/G/,g", [{ word: "linux", weight: 1 }], async (url) => {
    urls.push(url);
    return response([{ threads: [] }]);
  });
  assert.deepEqual(urls, ["https://a.4cdn.org/g/catalog.json"]);
});

test("failed and empty catalogs do not prevent a reply from another board", async () => {
  const reply = await getContextReply("g,vg,v", [{ word: "linux", weight: 1 }], async (url) => {
    if (url.endsWith("/g/catalog.json")) throw new Error("network unavailable");
    if (url.endsWith("/vg/catalog.json")) return response([{ threads: [] }]);
    if (url.endsWith("/v/catalog.json")) return response([{ threads: [{ no: 100, sub: "linux", replies: 1 }] }]);
    assert.equal(url, "https://a.4cdn.org/v/thread/100.json");
    return response({ posts: [{ no: 100, com: "OP" }, { no: 101, com: "working board reply" }] });
  });
  assert.equal(reply.board, "v");
});

test("thread request failures fall back to another board", async (t) => {
  t.mock.method(Math, "random", () => 0);
  const reply = await getContextReply("g,vg", [{ word: "linux", weight: 1 }], async (url) => {
    if (url.endsWith("catalog.json")) return response([{ threads: [{ no: 100, sub: "linux", replies: 1 }] }]);
    if (url.includes("/g/")) return response(null, 503);
    return response({ posts: [{ no: 100, com: "OP" }, { no: 101, com: "working board reply" }] });
  });
  assert.equal(reply.board, "vg");
});

test("textless matches cannot exhaust another board's attempts", async (t) => {
  t.mock.method(Math, "random", () => 0);
  let threadRequests = 0;
  const reply = await getContextReply("g,vg,v", [{ word: "linux", weight: 1 }], async (url) => {
    if (url.endsWith("catalog.json")) {
      return response([{ threads: [100, 200, 300, 400].map((no) => ({ no: no, sub: "linux", replies: 1 })) }]);
    }
    threadRequests++;
    const no = Number(url.match(/\/(\d+)\.json$/)[1]);
    return response({ posts: [{ no: no, com: "OP" }, { no: no + 1, com: url.includes("/v/") ? "linux usable reply" : "" }] });
  });
  assert.equal(threadRequests, 7);
  assert.equal(reply.board, "v");
});

test("all-board outages reject and all-board no matches return null", async () => {
  await assert.rejects(getContextReply("g,vg", [{ word: "linux", weight: 1 }], async () => response(null, 503)), /4chan api error 503/);
  assert.equal(await getContextReply("g,vg", [{ word: "linux", weight: 1 }], async () => response([{ threads: [] }])), null);
});

test("LLM request preserves speaker order, focus, configuration and output limits", async (t) => {
  setEnv(t, { LLM_BASE_URL: "https://provider.example/v1/", LLM_API_KEY: "test-key", LLM_MODEL: "test-model" });
  const text = await generateSchizoResponse(chat, async (url, options) => {
    assert.equal(url, "https://provider.example/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.ok(options.signal);
    const body = JSON.parse(options.body);
    assert.equal(body.model, "test-model");
    assert.equal(body.messages[0].role, "system");
    const conversation = JSON.parse(body.messages[1].content).conversation;
    assert.equal(conversation[0].speaker, "one");
    assert.equal(conversation[1].main_message, true);
    return response({ choices: [{ message: { content: "x".repeat(3000) } }] });
  });
  assert.equal(text.length, 2000);
  assert.ok(text.endsWith("…"));
});

test("local LLM works without an API key and provider errors are handled", async (t) => {
  setEnv(t, { LLM_MODEL: "local-model", LLM_API_KEY: "" });
  const text = await generateSchizoResponse(chat, async (url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return response({ choices: [{ message: { content: "  haunted speakers  " } }] });
  });
  assert.equal(text, "haunted speakers");
  await assert.rejects(generateSchizoResponse(chat, async () => response(null, 429)), /llm api error 429/);
  await assert.rejects(generateSchizoResponse(chat, async () => response({ choices: [] })), /no text/);
  process.env.LLM_MODEL = "";
  await assert.rejects(generateSchizoResponse(chat), /set LLM_MODEL/);
});

test("slash and message commands route separately from existing thread commands", () => {
  assert.ok(isSchizoCommand({ type: 1, name: "schizo" }));
  assert.ok(isSchizoCommand({ type: 3, name: "Schizo - LLM" }));
  assert.ok(isSchizoCommand({ type: 3, name: "Schizo - Thread Reply" }));
  assert.equal(isSchizoCommand({ type: 1, name: "thread" }), false);
  assert.equal(isSchizoCommand({ type: 1, name: "Schizo - LLM" }), false);
});

test("both modes receive the same collected context and count", async (t) => {
  setEnv(t, { SCHIZO_BOARD: "vip" });
  const services = {
    collectContext: async (input, count) => { assert.equal(count, 3); return chat; },
    generateSchizoResponse: async (context) => { assert.equal(context, chat); return "haunted"; },
    getContextReply: async (boards, keywords) => {
      assert.deepEqual(boards, ["g"]);
      assert.ok(keywords.some((item) => item.word === "haunted"));
      return { id: 101, board: "g", body: "haunted reply", reply: 0, url: "https://boards.4chan.org/g/thread/100#p101" };
    },
  };
  const options = [{ name: "count", value: 3 }, { name: "board", value: "/G/" }];
  const llm = await createSchizoResponse(interaction({ options: [...options, { name: "mode", value: "llm" }] }), services);
  const thread = await createSchizoResponse(interaction({ options: options }), services);
  assert.equal(llm.content, "haunted");
  assert.equal(thread.embeds[0].description, "haunted reply");
  assert.equal(thread.embeds[0].title, "/g/ >>101");
});

test("context-menu actions use five messages and the configured default board", async (t) => {
  setEnv(t, { SCHIZO_BOARDS: "", SCHIZO_BOARD: "vip" });
  const services = {
    collectContext: async (input, count) => { assert.equal(count, 5); return chat; },
    generateSchizoResponse: async () => "llm reply",
    getContextReply: async (boards) => { assert.deepEqual(boards, ["vip"]); return null; },
  };
  const llm = await createSchizoResponse(interaction({ type: 3, name: "Schizo - LLM" }), services);
  const thread = await createSchizoResponse(interaction({ type: 3, name: "Schizo - Thread Reply" }), services);
  assert.equal(llm.content, "llm reply");
  assert.match(thread.content, /no matching thread/);
});

test("single and multiple board options override defaults, with boards taking priority", async (t) => {
  setEnv(t, { SCHIZO_BOARDS: "g,vg,v", SCHIZO_BOARD: "vip" });
  for (const [options, expected] of [
    [[{ name: "boards", value: "vip" }], ["vip"]],
    [[{ name: "board", value: "vip" }], ["vip"]],
    [[{ name: "boards", value: "g,vg" }], ["g", "vg"]],
    [[{ name: "board", value: "vip" }, { name: "boards", value: "g,vg,v" }], ["g", "vg", "v"]],
  ]) {
    const payload = await createSchizoResponse(interaction({ options: options }), {
      collectContext: async () => chat,
      getContextReply: async (boards) => { assert.deepEqual(boards, expected); return null; },
    });
    assert.ok(expected.every((board) => payload.content.includes(`/${board}/`)));
  }
});

test("slash and context-menu defaults support one or multiple boards", async (t) => {
  setEnv(t, { SCHIZO_BOARDS: "g,vg,v", SCHIZO_BOARD: "vip" });
  for (const value of ["g", "g,vg", "g,vg,v"]) {
    process.env.SCHIZO_BOARDS = value;
    for (const input of [interaction(), interaction({ type: 3, name: "Schizo - Thread Reply" })]) {
      await createSchizoResponse(input, {
        collectContext: async () => chat,
        getContextReply: async (boards) => { assert.deepEqual(boards, value.split(",")); return null; },
      });
    }
  }
  process.env.SCHIZO_BOARDS = "";
  process.env.SCHIZO_BOARD = "";
  await createSchizoResponse(interaction(), {
    collectContext: async () => chat,
    getContextReply: async (boards) => { assert.deepEqual(boards, ["g"]); return null; },
  });
});

test("board validation happens before fetching context", async () => {
  for (const option of [{ name: "board", value: "../bad" }, { name: "boards", value: "g,vg,v,vip" }]) {
    await assert.rejects(createSchizoResponse(interaction({ options: [option] }), {
      collectContext: async () => assert.fail("should not fetch history"),
    }), /board/);
  }
});

test("deferred responses are completed through the interaction webhook without pings", async () => {
  let edited = false;
  await respondSchizo(interaction({ options: [{ name: "mode", value: "llm" }] }), {
    collectContext: async () => chat,
    generateSchizoResponse: async () => "@everyone <@1234> haunted",
    request: async (path, options) => {
      edited = true;
      assert.equal(path, "webhooks/123/test-token/messages/@original");
      assert.equal(options.method, "PATCH");
      assert.equal(options.body.content, "@everyone <@1234> haunted");
      assert.deepEqual(options.body.allowed_mentions, { parse: [], replied_user: false });
    },
  });
  assert.equal(edited, true);
});

test("context and provider failures finish the deferred response with an error", async () => {
  for (const error of [new Error("no readable chat"), new DOMException("timed out", "TimeoutError")]) {
    await respondSchizo(interaction(), {
      collectContext: async () => { throw error; },
      request: async (path, options) => {
        assert.match(options.body.content, /no readable chat|took too long/);
        assert.deepEqual(options.body.allowed_mentions.parse, []);
      },
    });
  }
});
