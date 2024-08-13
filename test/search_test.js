import fetch from "node-fetch";

export async function searchGeneral(boardParams, searchWord) {
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
        if (String(threadObj.title).toLowerCase().includes(`/${searchWord}/`)) {
          threadList.push(threadObj);
        }
      });
    });

    let resultThread = threadList[0];
    let returnThread = {
      thread: resultThread.thread,
      name: resultThread.thread,
      body: "",
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
      returnThread.body = `${htmlclean(resultThread.body.substring(0, 1200))}`;
    }
    console.log(returnThread);
  } catch (err) {
    console.error(err);
  }
}

export async function searchThreads(boardParams, searchWord) {
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
        if (String(threadObj.title).toLowerCase().includes(searchWord)) {
          threadList.push(threadObj);
        }
        if (String(threadObj.body).toLowerCase().includes(searchWord)) {
          threadList.push(threadObj);
        }
      });
    });

    console.log(threadList.map((thread) => ({
      thread: thread.thread,
      title: thread.title,
      body: thread.body,
      reply: thread.reply,
    })));
  } catch (err) {
    console.error(err);
  }
}

export async function searchTitle(boardParams, searchWord, isGeneral = false) {
    const endpoint = `https://a.4cdn.org/${boardParams}/catalog.json`;
    const threadList = [];
    const searchLower = searchWord.toLowerCase();
  
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
            let isMatch = title.includes(searchLower) || body.includes(searchLower);
            if (isGeneral){
                isMatch = title.includes(`/${searchLower}/`);
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
            returnThread.image = `https://i.4cdn.org/${boardParams}/${resultThread.file}`;
        }
        if (resultThread.title) {
            returnThread.name = `${htmlclean(resultThread.title)} - ${resultThread.thread}`;
        }
        if (resultThread.body) {
            returnThread.body = `${htmlclean(resultThread.body.substring(0, 1200))}`;
        }
        console.log(returnThread);
      } else {
        console.log(threadList.map((thread) => ({
            thread: thread.thread,
            title: thread.title,
            body: thread.body,
            reply: thread.reply,
          })));
      }
    } catch (err) {
      console.error(err);
    }
  }

// searchGeneral("vt", "ggg")
// searchThreads("vt", "suisei")
// searchTitle("vg", "zzz", false)

export async function searchReply(boardParams, threadParams, searchWord) {
  const endpoint = `https://a.4cdn.org/${boardParams}/thread/${threadParams}.json`;
  // map for reply check
  const idMap = new Map();
  let idRep = 0;
  const replyList = [];
  const searchLower = searchWord.toLowerCase();

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
      const body = post.com ? post.com.toLowerCase() : "";
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
      if (body.includes(searchLower)) replyList.push(tempReplyObj);
    });
    console.log("----- done check map val -----");
    // sort array from map iter for limitResult size
    let limitResult = replyList.length>20 ? replyList.slice(0,20) : replyList.length;
    if(limitResult<2) {
      let resultReply = replyList[0];
      resultReply.reply=idMap.get(resultReply.id);
      resultReply.image=`https://i.4cdn.org/${boardParams}/${resultReply.file}`;
      console.log(resultReply);
    }
    else {
      let resultReply = []
      for (let index = 0; index < limitResult; index++) {
        replyList[index].reply=idMap.get(replyList[index].id)
        replyList[index].image=`https://i.4cdn.org/${boardParams}/${replyList[index].file}`
        resultReply.push(replyList[index]);
    }
    console.log(resultReply)
    }
  } catch (err) {
    console.error(err);
  }
}

searchReply("vg", 490058734, "listen")

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
