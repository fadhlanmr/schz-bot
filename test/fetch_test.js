import fetch from "node-fetch";
import { JSDOM } from 'jsdom';

function getValas() {
  fetch('https://bankina.co.id/id/valas/')
    .then(response => response.text())
    .then(html => {
      const dom = new JSDOM(html);
      const valasSection = dom.window.document.querySelector('.m-section.valas');

      if (!valasSection) {
        console.error('Valas section not found in the response');
        return;
      }

      const tableBody = valasSection.querySelector('tbody');
      const rows = tableBody.querySelectorAll('tr');

      const exchangeRates = {};

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const currency = cells[0].textContent;
        const sellRate = Number(cells[1].textContent.replace('.','').split(',')[0]);
        const buyRate = Number(cells[2].textContent.replace('.','').split(',')[0]);

        exchangeRates[currency] = {
          sell: sellRate,
          buy: buyRate
        };
      });
      console.log(JSON.stringify(exchangeRates));
    })
    .catch(error => {
      console.error('Error fetching the page:', error);
    });
}
console.log(getValas());

export async function getThreads(boardParams, returnTopThread = false) {
  console.time('threadSearch')    
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
  
      if (returnTopThread) {
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
        console.timeEnd('threadSearch')
        return returnThread;
      } else {
        console.timeEnd('threadSearch')
        return threadList;
      }
    } catch (err) {
      console.error(err);
      console.timeEnd('threadSearch')
    }
  }
  
console.log(getThreads("vt"));

export async function getReply(boardParams, threadParams, limitParams) {
  console.time('replySearch')    
  const endpoint = `https://kong-4c1a7dd269uspw8z7.kongcloud.dev/a/${boardParams}/thread/${threadParams}.json`;
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
      topReply.push(tempReplyObj);
    });
    console.log("----- done check map val -----");
    // sort array from map iter for limitParams size
    console.log("----- done sort map val -----");
    if(limitParams<2) {
      let topMap = [...idMap.entries()].reduce((a, e ) => e[1] > a[1] ? e : a)
      let pos = topReply.map((e) => e.id).indexOf(topMap[0]);
      topReply[pos].reply=topMap[1];
      topReply[pos].image=`https://kong-4c1a7dd269uspw8z7.kongcloud.dev/i.org/${boardParams}/${topReply[pos].file}`
      console.timeEnd('replySearch')
      return topReply[pos];
    }
    else {
      let sortedMap = [...idMap.entries()].sort((a, b) => b[1] - a[1]).slice(0,limitParams)
      let resultReply = []
      for (let index = 0; index < limitParams; index++) {
        let pos = topReply.map((e) => e.id).indexOf(sortedMap[index][0]);
        topReply[pos].reply=sortedMap[index][1];
        topReply[pos].image=`https://kong-4c1a7dd269uspw8z7.kongcloud.dev/i.org/${boardParams}/${topReply[pos].file}`
        resultReply.push(topReply[pos]);
    }
    console.timeEnd('replySearch')
    return resultReply
    }
  } catch (err) {
    console.error(err);
    console.timeEnd('replySearch')
  }
  
}

console.log(getReply("vt", 87079594, 10))

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
  