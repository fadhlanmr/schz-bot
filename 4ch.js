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
      image: "",
    };
    if (resultThread.filename) {
      returnThread.image = `https://i.4cdn.org/${boardParams}/${resultThread.file}`;
    }
    if (resultThread.title) {
      returnThread.name = `${htmlclean(resultThread.title)} - ${resultThread.thread}`;
    }
    if (resultThread.body) {
      returnThread.value = `${htmlclean(resultThread.body.substring(0, 1200))}`;
    }
    return returnThread;
  } catch (err) {
    console.error(err);
  }
}

export async function getListThread(boardParams) {
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
    console.log("--- threads sorted ---");
    return threadList;
  } catch (err) {
    console.error(err);
  }
}

// console.log(await getThreadList("vt"));

export async function getTopReply(boardParams, threadParams) {
  const endpoint = `https://a.4cdn.org/${boardParams}/thread/${threadParams}.json`;
  // map for reply check
  const idMap = new Map();
  let idRep = 0;
  const topReply = [];

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
    const posts = data.posts;
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
      };
      // if reply has body / message
      if (tempReplyObj.body) {
        // check if post has mention (>>[number])
        if ((post = htmlclean(tempReplyObj.body).match(/(?:>>)|([0-9])+/g))) {
          // parse string of mention
          let tempRes = parseInt(post[1]);
          // mentioned reply get +1 val in map
          idMap.set(tempRes, idMap.get(tempRes) + 1);
          // set current counter to most replied
          if (
            idMap.get(tempRes) > idMap.get(idRep) ||
            !idMap.get(idRep) ||
            idMap.get(idRep) == NaN
          ) {
            idRep = tempRes;
          }
        }
      }
      topReply.push(tempReplyObj);
    });
    console.log("----- done check map val -----");
    console.log(`----- id = ${idRep} -----`);
    const pos = topReply.map((e) => e.id).indexOf(idRep);

    let resultReply = topReply[pos];
    let returnReply = {
      name: `>>${resultReply.id}`,
      value: `either deleted or jannies sucks - ${resultReply.time}`,
      reply: idMap.get(resultReply.id),
      image: "",
      url: `https://boards.4chan.org/${boardParams}/thread/${threadParams}#p${resultReply.id}`
    };
    if (resultReply.filename) {
      returnReply.image = `https://i.4cdn.org/${boardParams}/${resultReply.file}`;
    }
    if (resultReply.body) {
      returnReply.value = `${htmlclean(resultReply.body.substring(0, 1200))}`;
    }
    return returnReply;
  } catch (err) {
    console.error(err);
  }
}

// console.log(await getTopReply("vt", 79320260))

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
