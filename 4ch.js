import fetch from "node-fetch";

export async function getTopThread(boardParams) {
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
          filename: item.filename,
          file: `${item.tim}${item.ext}`,
        };
        threadList.push(threadObj);
      });
    });
    threadList.sort((a, b) => b.reply - a.reply);
    console.log("--- thread sorted ---");

    let resultThread = threadList[0];
    let returnThread = {
      thread: resultThread.thread,
      name: resultThread.thread,
      value: "",
      reply: resultThread.reply,
      image: ""
    }
    if (resultThread.filename) {
      returnThread.image = `https://i.4cdn.org/${boardParams}/${resultThread.file}`
    }
    if (resultThread.title) {
      returnThread.name = `${resultThread.title} - ${resultThread.thread}`
    }
    if (resultThread.body) {
      returnThread.value = `${htmlclean(resultThread.body.substring(0, 500))}`
    } 
    return returnThread
  } catch (err) {
    console.error(err);
  }
}

// console.log(await getThreadList("vt"));

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
