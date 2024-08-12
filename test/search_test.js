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
