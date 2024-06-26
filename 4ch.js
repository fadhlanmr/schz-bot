import fetch from "node-fetch";

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

export async function getThreadList(boardParams) {
  const endpoint = `https://a.4cdn.org/${boardParams}/catalog.json`;
  const threadList = [];

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const data = await res.json();
      console.log(res.status);
      throw new Error(JSON.stringify(data));
    }
    const data = await res.json();
    data.forEach((page) => {
      page.threads.forEach((item) => {
        const threadObj = {
          thread: item.no,
          title: item.sub,
          body: item.com,
          reply: item.replies,
        };
        threadList.push(threadObj);
      });
    });
    threadList.sort((a, b) => b.reply - a.reply);
    console.log("--- array sorted ---");
    return threadList[0];
  } catch (err) {
    console.error(err);
  }
}

// console.log(await getThreadList("vt"));