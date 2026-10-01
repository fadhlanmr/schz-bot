// test for embed size budget and message components
import {
  parseCustomId,
  createThreadEmbed,
  createListThreadEmbed,
  createReplyEmbed,
  createListReplyEmbed,
  createThreadSelectRow,
  createReplyThreadRow,
  createReplyButtonRow,
  createListReplyButtonRow,
  createReplyControlRows,
  createReplySelectRow,
} from "../utils.js";

let failed = 0;
function check(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} - ${name}`);
  if (!cond) failed++;
}

// what discord counts against the 6000 char embed limit
function embedSize(embed) {
  let size = (embed.title || "").length + (embed.description || "").length + (embed.footer?.text || "").length;
  (embed.fields || []).forEach((field) => {
    size += field.name.length + field.value.length;
  });
  return size;
}

function fakeThreads(count) {
  const threadList = [];
  for (let index = 0; index < count; index++) {
    threadList.push({
      thread: 100000 + index,
      title: `some long thread title ${index} ` + "x".repeat(300),
      body: `thread body ${index} ` + "y".repeat(3000),
      reply: 40 - index,
      filename: "file",
      file: `111${index}.jpg`,
    });
  }
  return threadList;
}

function fakeReplies(count) {
  const replyList = [];
  for (let index = 0; index < count; index++) {
    replyList.push({
      id: 200000 + index,
      body: `reply body ${index} ` + "z".repeat(3000),
      reply: 10 - index,
      filename: "file",
      image: `https://i.4cdn.org/vip/111${index}.jpg`,
      url: `https://boards.4chan.org/vip/thread/100000#p${200000 + index}`,
    });
  }
  return replyList;
}

// --- custom id round trip ---
let customData = parseCustomId("schz:th_pick:vip");
check("parse th_pick", customData.action === "th_pick" && customData.board === "vip");

customData = parseCustomId("schz:th_reply:vip:123456789");
check("parse th_reply thread", customData.action === "th_reply" && customData.thread === "123456789");

customData = parseCustomId("schz:th_reply_list:vip:5:");
check("parse th_reply_list empty query", customData.action === "th_reply_list" && customData.limit === 5 && customData.query === "");

customData = parseCustomId("schz:th_reply_list:vip:25:foo:bar");
check("parse th_reply_list query with colon", customData.query === "foo:bar" && customData.limit === 25);

customData = parseCustomId("schz:rp_top:vip:123456789:l:10");
check("parse rp_top top reply list", customData.action === "rp_top" && customData.thread === "123456789" && customData.mode === "l" && customData.limit === 10);

customData = parseCustomId("schz:rp_pick:vip:123456789:s:waifu");
check("parse rp_pick search result", customData.action === "rp_pick" && customData.mode === "s" && customData.query === "waifu");

// --- custom id stays under the 100 char limit ---
const longQuery = "q".repeat(200);
const listReplyRow = createListReplyButtonRow("vipg", 25, longQuery);
check("th_reply_list custom id length", listReplyRow.components[0].custom_id.length <= 100);

const replyPickRow = createReplySelectRow("vipg", 123456789, "s", longQuery, fakeReplies(3), 0);
check("rp_pick custom id length", replyPickRow.components[0].custom_id.length <= 100);

const replyRows = createReplyControlRows("vipg", 123456789, "l", longQuery);
check("rp_top custom id length", replyRows[0].components[0].custom_id.length <= 100);
check("rp_limit custom id length", replyRows[1].components[0].custom_id.length <= 100);

// --- list embed size budget ---
const bigEmbed = createListThreadEmbed("vip", fakeThreads(25), 25);
check("25 thread embed total under 6000", embedSize(bigEmbed) <= 6000);
check("25 thread embed field count", bigEmbed.fields.length <= 25);
check("25 thread embed field value under 1024", bigEmbed.fields.every((field) => field.value.length <= 1024));
check("25 thread embed field name under 256", bigEmbed.fields.every((field) => field.name.length <= 256));
check("25 thread embed got dropped", bigEmbed.footer.text.includes("hit embed size limit"));

const smallEmbed = createListThreadEmbed("vip", fakeThreads(2), 2);
check("2 thread embed keep rich body", smallEmbed.fields[0].value.length > 500);
check("2 thread embed total under 6000", embedSize(smallEmbed) <= 6000);
check("2 thread embed no drop", !smallEmbed.footer.text.includes("hit embed size limit"));

const bigReplyEmbed = createListReplyEmbed("vip", 100000, fakeReplies(25), 25);
check("25 reply embed total under 6000", embedSize(bigReplyEmbed) <= 6000);
check("25 reply embed field value under 1024", bigReplyEmbed.fields.every((field) => field.value.length <= 1024));
check("25 reply embed compact enough to keep all", bigReplyEmbed.fields.length === 25);

// --- single embed body ---
const singleThread = {
  thread: 100000,
  name: `some title - 100000`,
  body: "w".repeat(9000),
  reply: 40,
  image: "",
};
const singleEmbed = createThreadEmbed("vip", singleThread);
check("single thread body under 3500", singleEmbed.description.length <= 3500);
check("single thread no empty image", singleEmbed.image === undefined);

const singleReply = {
  id: 200000,
  body: `<span class="quote">&gt;be me</span><br>${"w".repeat(9000)}`,
  reply: 5,
  image: "",
  url: "https://boards.4chan.org/vip/thread/100000#p200000",
};
const singleReplyEmbed = createReplyEmbed(singleReply);
check("single reply body under 3500", singleReplyEmbed.description.length <= 3500);
check("single reply body is cleaned", !singleReplyEmbed.description.includes("<span"));
check("single reply no empty image", singleReplyEmbed.image === undefined);

// --- dropdown rows ---
const threadRow = createThreadSelectRow("vip", fakeThreads(30));
const threadSelect = threadRow.components[0];
check("thread dropdown max 25 option", threadSelect.options.length <= 25);
check("thread dropdown label under 100", threadSelect.options.every((item) => item.label.length <= 100));
check("thread dropdown desc under 100", threadSelect.options.every((item) => item.description.length <= 100));
check("thread dropdown value is thread no", threadSelect.options[0].value === "100000");

const replyThreadRow = createReplyThreadRow("vip", fakeThreads(2));
check("reply thread dropdown custom id", replyThreadRow.components[0].custom_id === "schz:rp_thread:vip");

const replyButtonRow = createReplyButtonRow("vip", 100000);
check("reply button custom id", replyButtonRow.components[0].custom_id === "schz:th_reply:vip:100000");

check("control rows in top reply list mode", createReplyControlRows("vip", 100000, "l", 2).length === 2);
check("control rows in search mode", createReplyControlRows("vip", 100000, "s", "waifu").length === 1);

const pickedRow = createReplySelectRow("vip", 100000, "l", 5, fakeReplies(3), 200001);
check("reply dropdown mark picked option", pickedRow.components[0].options[1].default === true);

console.log(failed ? `----- ${failed} test failed -----` : "----- all test passed -----");
process.exit(failed ? 1 : 0);
