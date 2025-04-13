#!/usr/bin/env node
const distribution = require("../config.js");
const id = distribution.util.id;

// Define the mapper function
// Helper function to fetch HTML content (Refactored to return a Promise)

async function imdbMapper(key, value, callback) {
  const url = value;

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function fetchHTML(url) {
    const https = require("https");

    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        if (response.statusCode === 503) {
          reject({
            retryable: true,
            statusCode: 503,
            message: `503 Service Unavailable: ${url}`,
          });
          return;
        }

        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to load page, status code: ${response.statusCode}. Url: ${url}`
            )
          );
          return;
        }

        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          resolve(data);
        });
      });

      request.on("error", (err) => {
        reject(err);
      });

      request.setTimeout(111000, () => {
        request.abort();
        reject(new Error("Request timed out"));
      });
    });
  }

  async function fetchHTMLWithRetry(url, attempts = 10) {
    try {
      return await fetchHTML(url);
    } catch (err) {
      if ((err.retryable && err.statusCode === 503) || attempts > 1) {
        console.warn(
          `Fetch failed, retrying (try #${
            10 - attempts + 1
          } after long delay... (${url})`
        );
        // Delay more significantly before retrying
        await delay(10000);
        return fetchHTMLWithRetry(url, attempts - 1);
      } else {
        throw err;
      }
    }
  }

  function getBaseURL(url) {
    const parsedURL = new URL(url);
    return `${parsedURL.protocol}//${parsedURL.host}`;
  }

  try {
    // Initial random polite delay
    await delay(1000);
    const html = await fetchHTMLWithRetry(url);
    const { JSDOM } = require("jsdom");
    const { URL } = require("url");
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const baseURL = getBaseURL(url);

    let ratingElement = document.querySelector("div.allmovie-rating");

    if (!ratingElement) {
      callback(new Error("Rating element not found for this url:" + url), null);
      return;
    }

    const rating = Number(ratingElement.textContent.split(" ")[0]);

    const moreLikeThis = document.querySelectorAll("a.poster-link");

    if (moreLikeThis.length === 0) {
      callback(new Error("No related books found for this url:" + url), null);
      return;
    }

    const similar = [];

    moreLikeThis.forEach((link) => {
      if (!link) {
        console.error("Link is null or undefined");
        callback(new Error("Link is null or undefined"), null);
        return;
      }

      const href = link.getAttribute("href");
      const url_slice = new URL(href, baseURL).href;
      const title = link.getAttribute("title");

      similar.push({
        [title]: {
          keyUrl: url_slice,
          sourceURL: url,
          sourceRating: rating,
          sourceName: key,
        },
      });
    });

    callback(null, [similar]);
  } catch (error) {
    console.error("Error fetching or processing HTML:", error);
    callback(null, [
      {
        [JSON.stringify({ url: url, rating: "N/A" })]: [],
      },
    ]);
  }
}

const reducer = (key, values) => {
  return { [key]: values };
};

const nodes = Array.from({ length: 100 }, (_, i) => ({
  ip: "127.0.0.1",
  port: 7110 + i,
}));

const imdbGroup = {};
nodes.forEach((node) => {
  imdbGroup[id.getSID(node)] = node;
});

const groupConfig = { gid: "imdbGroup" };
let dataset = [
  { "The Amateur": "https://www.allmovie.com/movie/the-amateur-am612871" },
  {
    "A Minecraft Movie":
      "https://www.allmovie.com/movie/a-minecraft-movie-am125648",
  },
  { "Om Shanti Om": "https://www.allmovie.com/movie/om-shanti-om-am9195" },
];
let keys = dataset.map((o) => Object.keys(o)[0]);

const visitedUrls = new Set();
const visitedTitles = new Set();

async function runIterations(localServer, maxIters = 10) {
  for (let i = 0; i < 10; i++) {
    console.log("Iteration:", i);
    // Change this to log to a file instead of the console

    await new Promise((resolve) => {
      let counter = 0;
      keys = dataset.map((o) => Object.keys(o)[0]);
      const fs = require("fs");
      const logStream = fs.createWriteStream("log.txt", { flags: "a" });
      logStream.write(`Iteration ${i}:\n`);
      logStream.write("Dataset Size: " + dataset.length + "\n");
      logStream.write("Visited URL Size: " + visitedUrls.size + "\n");
      logStream.end();
      dataset.forEach((entry) => {
        const key = Object.keys(entry)[0];

        const value = entry[key];
        visitedUrls.add(value);
        visitedTitles.add(key);

        distribution.imdbGroup.store.put(value, key, () => {
          counter++;
          if (counter === dataset.length) {
            distribution.imdbGroup.mr.exec(
              { keys: keys, map: imdbMapper, reduce: reducer },
              (err, result) => {
                if (err) {
                  console.error("MapReduce failed:", err);
                } else {
                  dataset = [];

                  for (const value of result) {
                    const key = Object.keys(value)[0];
                    const keyUrl = value[key][0].keyUrl;
                    const name = value[key][0].name;

                    if (!visitedUrls.has(keyUrl)) {
                      dataset.push({ [key]: keyUrl });
                    }
                  }
                }

                resolve();
              }
            );
          }
        });
      });
    });
  }

  shutdownAll(localServer);
}

function startNodes(cb) {
  const startNext = (index) => {
    if (index >= nodes.length) return cb();
    distribution.local.status.spawn(nodes[index], () => startNext(index + 1));
  };
  startNext(0);
}

distribution.node.start((localServer) => {
  console.log("Local node (orchestrator) started");

  startNodes(() => {
    distribution.local.groups.put(groupConfig, imdbGroup, () => {
      distribution.imdbGroup.groups.put(groupConfig, imdbGroup, () => {
        runIterations(localServer);
      });
    });
  });
});

function shutdownAll(localServer) {
  const remote = { service: "status", method: "stop" };

  const stopNext = (index) => {
    if (index >= nodes.length) {
      localServer.close();
      console.log("All nodes stopped and local server closed.");
      return;
    }

    remote.node = nodes[index];
    distribution.local.comm.send([], remote, () => stopNext(index + 1));
  };

  stopNext(0);
}
