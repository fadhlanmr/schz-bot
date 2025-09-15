import fetch from "node-fetch";

export async function getThreads(boardParams, limitParams) {
  const endpoint = `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/a/${boardParams}/catalog.json`;
  const threadList = [];

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      console.log(res.status, await res.text());
      throw new Error("failed");
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
    console.log("--- threads sorted ---");

    if (limitParams < 2) {
      let resultThread = threadList[0];
      let returnThread = {
        thread: resultThread.thread,
        name: resultThread.thread,
        body: "",
        reply: resultThread.reply,
        image: "",
      };
      if (resultThread.filename) {
        returnThread.image = `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/i.org/${boardParams}/${resultThread.file}`;
      }
      if (resultThread.title) {
        returnThread.name = `${htmlclean(resultThread.title)} - ${resultThread.thread}`;
      }
      if (resultThread.body) {
        returnThread.body = `${htmlclean(resultThread.body.substring(0, 1200))}`;
      }
      return returnThread;
    } else {
      return threadList;
    }
  } catch (err) {
    console.error(err);
  }
}

export async function getReply(boardParams, threadParams, limitParams) {
  const endpoint = `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/a/${boardParams}/thread/${threadParams}.json`;
  // map for reply check
  const idMap = new Map();
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
      let fullFilename = "";
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
        url: `https://boards.4chan.org/${boardParams}/thread/${threadParams}#p${post.no}`,
      };
      // if reply has body / message
      if (tempReplyObj.body) {
        // check if post has mention (>>[number])
        if ((post = htmlclean(tempReplyObj.body).match(/>>(\d+)/))) {
          // parse string of mention
          let tempRes = parseInt(post[1]);
          // mentioned reply get +1 val in map
          if (tempRes > threadParams && Number.isInteger(idMap.get(tempRes))) {
            idMap.set(tempRes, idMap.get(tempRes) + 1);
          }
        }
      }
      topReply.push(tempReplyObj);
    });
    console.log("----- done check map val -----");
    // sort array from map iter for limitParams size
    let sortedMap = [...idMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitParams);
    console.log("----- done sort map val -----");
    if (limitParams < 2) {
      let pos = topReply.map((e) => e.id).indexOf(sortedMap[0][0]);
      topReply[pos].reply = sortedMap[0][1];
      topReply[pos].image =
        `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/i.org/${boardParams}/${topReply[pos].file}`;
      return topReply[pos];
    } else {
      let resultReply = [];
      for (let index = 0; index < limitParams; index++) {
        let pos = topReply.map((e) => e.id).indexOf(sortedMap[index][0]);
        topReply[pos].reply = sortedMap[index][1];
        topReply[pos].image =
          `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/i.org/${boardParams}/${topReply[pos].file}`;
        resultReply.push(topReply[pos]);
      }
      return resultReply;
    }
  } catch (err) {
    console.error(err);
  }
}

export async function searchThreads(boardParams, searchWord, isGeneral) {
  const endpoint = `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/a/${boardParams}/catalog.json`;
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
        const title = item.sub ? item.sub.toLowerCase() : "";
        const body = item.com ? item.com.toLowerCase() : "";
        let isMatch = title.includes(searchWord) || body.includes(searchWord);
        if (isGeneral) {
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

    if (isGeneral) {
      let resultThread = threadList[0];
      let returnThread = {
        thread: resultThread.thread,
        name: resultThread.thread,
        body: "",
        reply: resultThread.reply,
        image: "",
      };
      if (resultThread.filename) {
        returnThread.image = `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/i.org/${boardParams}/${resultThread.file}`;
      }
      if (resultThread.title) {
        returnThread.name = `${htmlclean(resultThread.title)} - ${resultThread.thread}`;
      }
      if (resultThread.body) {
        returnThread.body = `${htmlclean(resultThread.body.substring(0, 1200))}`;
      }
      return returnThread;
    } else {
      return threadList;
    }
  } catch (err) {
    console.error(err);
  }
}

export async function searchReply(boardParams, threadParams, searchWord) {
  const endpoint = `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/a/${boardParams}/thread/${threadParams}.json`;
  // map for reply check
  const idMap = new Map();
  const replyList = [];

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
      // return "not a thread, or error input";
    }
    const data = await res.json();
    const posts = data.posts;
    posts.forEach((post) => {
      let fullFilename = "";
      // something funny happen, because instead of checking typeof it's checking value null
      if (post.filename) {
        fullFilename = `${post.tim}${post.ext}`;
      }
      // set post.id.reply = 0
      idMap.set(post.no, 0);
      const body = post.com ? post.com.toLowerCase() : "";
      let tempReplyObj = {
        id: post.no,
        body: post.com,
        time: post.time,
        filename: post.filename,
        file: fullFilename,
        reply: 0,
        image: "",
        url: `https://boards.4chan.org/${boardParams}/thread/${threadParams}#p${post.no}`,
      };
      // if reply has body / message
      if (tempReplyObj.body) {
        // check if post has mention (>>[number])
        if ((post = htmlclean(tempReplyObj.body).match(/>>(\d+)/))) {
          // parse string of mention
          let tempRes = parseInt(post[1]);
          // mentioned reply get +1 val in map
          if (tempRes > threadParams && Number.isInteger(idMap.get(tempRes))) {
            idMap.set(tempRes, idMap.get(tempRes) + 1);
          }
        }
      }
      if (body.includes(searchWord)) replyList.push(tempReplyObj);
    });
    console.log("----- done check map val -----");
    // limit result to 20 if over
    if (!replyList) {
      return replyList;
    }
    let limitResult = replyList.length > 20 ? 20 : replyList.length;
    if (limitResult < 2) {
      let resultReply = replyList[0];
      resultReply.reply = idMap.get(resultReply.id);
      resultReply.image = `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/i.org/${boardParams}/${resultReply.file}`;
      return resultReply;
    } else {
      let resultReply = [];
      for (let index = 0; index < limitResult; index++) {
        replyList[index].reply = idMap.get(replyList[index].id);
        replyList[index].image =
          `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/i.org/${boardParams}/${replyList[index].file}`;
        resultReply.push(replyList[index]);
      }
      return resultReply;
    }
  } catch (err) {
    console.error(err);
  }
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
