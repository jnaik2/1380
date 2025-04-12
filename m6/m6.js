#!/usr/bin/env node
const distribution = require("../config.js");
const id = distribution.util.id;

// Define the mapper function
// Helper function to fetch HTML content (Refactored to return a Promise)

async function imdbMapper(key, value, callback) {
  // console.log(`imdbMapper called with key=${key}, value=${value}`);

  // Use dependencies passed from the MapReduce framework
  const url = value;

  // Helper function to fetch HTML content (Refactored to return a Promise)
  function fetchHTML(url) {
    const https = require("https");
    return new Promise((resolve, reject) => {
      //   console.log('Getting content from url: ', url);
      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `Failed to load page, status code: ${response.statusCode}`
              )
            );
            return;
          }

          let data = "";
          response.on("data", (chunk) => {
            //   console.log('GETTING DATA');
            data += chunk;
          });
          response.on("end", () => {
            //   console.log('GOT ALL DATA');
            resolve(data);
          });
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  function getBaseURL(url) {
    const parsedURL = new URL(url);
    return `${parsedURL.protocol}//${parsedURL.host}`;
  }

  try {
    const html = await fetchHTML(url);

    const { JSDOM } = require("jsdom");
    const { URL } = require("url");
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const baseURL = getBaseURL(url);

    let ratingElement = document.querySelector("div.allmovie-rating");

    if (!ratingElement) {
      // Critical error
      console.error("Rating element not found on the page.", url);
      callback(new Error("Rating element not found"), null);
      return;
    }

    // Text Content of the form 4.1 (194 ratings)
    const rating = Number(ratingElement.textContent.split(" ")[0]);

    const moreLikeThis = document.querySelectorAll("a.poster-link");

    if (moreLikeThis.length === 0) {
      // Critical error, no related books
      console.error("No related books found on the page.");
      callback(new Error("No related books found"), null);
      return;
    }

    const similar = [];

    moreLikeThis.forEach((link) => {
      if (!link) {
        // Handle the case where the link is null or undefined
        console.error("Link is null or undefined");
        callback(new Error("Link is null or undefined"), null);
        return;
      }
      if (link.hasAttribute("href")) {
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
      } else {
        console.error("Link without href attribute found:", link);
        callback(new Error("Link without href attribute found"), null);
        return;
      }
    });
    callback(null, [similar]); // Use callback to signal completion with the result
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

const nodes = Array.from({ length: 5 }, (_, i) => ({
  ip: "127.0.0.1",
  port: 7210 + i,
}));

const imdbGroup = {};
nodes.forEach((node) => {
  imdbGroup[id.getSID(node)] = node;
});

const groupConfig = { gid: "imdbGroup" };
let dataset = [
  { "The Amateur": "https://www.allmovie.com/movie/the-amateur-am612871" },
];
let keys = dataset.map((o) => Object.keys(o)[0]);

const visitedUrls = new Set();
const visitedTitles = new Set();

async function runIterations(localServer, maxIters = 10) {
  for (let i = 0; i < 10; i++) {
    console.log("Iteration:", i);
    console.log("Visited Titles:", visitedTitles.size);

    await new Promise((resolve) => {
      let counter = 0;
      keys = dataset.map((o) => Object.keys(o)[0]);
      console.log("Size of dataset:", dataset.length);
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
