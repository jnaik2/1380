#!/usr/bin/env node
const { log } = require("console");
const distribution = require("../config.js");
const id = distribution.util.id;
const { Worker } = require("worker_threads");

// Define the mapper function
// Helper function to fetch HTML content (Refactored to return a Promise)

async function imdbMapper(key, value, callback) {
  const randomDelay = Math.random() * 1000;
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

      request.setTimeout(500000, () => {
        request.abort();
        reject(new Error("Request timed out"));
      });
    });
  }

  async function fetchHTMLWithRetry(url, attempts = 6) {
    const numTry = 6 - attempts + 1;
    try {
      return await fetchHTML(url);
    } catch (err) {
      if ((err.retryable && err.statusCode === 503) || attempts > 0) {
        // console.warn(
        //   `Fetch failed, retrying (try #${numTry} after long delay... (${url})`
        // );
        // Try exponential backoff delay
        const delayTime = Math.random() * (6 - attempts + 2) * 15000;
        await delay(delayTime + randomDelay);
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
    await delay(randomDelay);
    const html = await fetchHTMLWithRetry(url + "/related");
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

// const nodes = Array.from({ length: 10 }, (_, i) => ({
//   ip: "127.0.0.1",
//   port: 7310 + i,
// }));

// const nodes = [];
// const n1 = { ip: "3.145.76.237", port: 1234 };
// nodes.push(n1);
// const n2 = { ip: "3.149.213.219", port: 1234 };
// nodes.push(n2);
// const n3 = { ip: "3.144.19.33", port: 1234 };
// nodes.push(n3);
// const n4 = { ip: "18.227.0.115", port: 1234 };
// nodes.push(n4);
// const n5 = { ip: "3.144.42.193", port: 1234 };
// nodes.push(n5);
// const n6 = { ip: "3.128.87.180", port: 1234 };
// nodes.push(n6);
// const n7 = { ip: "13.58.20.60", port: 1234 };
// nodes.push(n7);
// const n8 = { ip: "3.135.186.61", port: 1234 };
// nodes.push(n8);
// const n9 = { ip: "3.140.196.218", port: 1234 };
// nodes.push(n9);
// const n10 = { ip: "3.15.141.223", port: 1234 };
// nodes.push(n10);
// const n11 = { ip: "18.118.139.89", port: 1234 };
// nodes.push(n11);
// const n12 = { ip: "18.119.143.44", port: 1234 };
// nodes.push(n12);
// const n13 = { ip: "18.225.234.2", port: 1234 };
// nodes.push(n13);
// const n14 = { ip: "52.15.193.243", port: 1234 };
// nodes.push(n14);
// const n15 = { ip: "3.128.95.181", port: 1234 };
// nodes.push(n15);

const nodes = [];
const n1 = { ip: "3.145.76.237", port: 1234 };
nodes.push(n1);
const n2 = { ip: "3.149.213.219", port: 1234 };
nodes.push(n2);
const n3 = { ip: "3.144.19.33", port: 1234 };
nodes.push(n3);
const n4 = { ip: "18.227.0.115", port: 1234 };
nodes.push(n4);
const n5 = { ip: "3.144.42.193", port: 1234 };
nodes.push(n5);
const n6 = { ip: "3.128.87.180", port: 1234 };
nodes.push(n6);
const n7 = { ip: "13.58.20.60", port: 1234 };
nodes.push(n7);
const n8 = { ip: "3.135.186.61", port: 1234 };
nodes.push(n8);
const n9 = { ip: "3.140.196.218", port: 1234 };
nodes.push(n9);
const n10 = { ip: "3.15.141.223", port: 1234 };
nodes.push(n10);
const n11 = { ip: "18.118.139.89", port: 1234 };
nodes.push(n11);
const n12 = { ip: "18.119.143.44", port: 1234 };
nodes.push(n12);
// const n13 = { ip: "18.225.234.2", port: 1234 };
// nodes.push(n13);
// const n14 = { ip: "52.15.193.243", port: 1234 };
// nodes.push(n14);
// const n15 = { ip: "3.128.95.181", port: 1234 };
// nodes.push(n15);

const imdbGroup = {};
nodes.forEach((node) => {
  imdbGroup[id.getSID(node)] = node;
});
// const imdbGroup = {};
// nodes.forEach((node) => {
//   imdbGroup[id.getSID(node)] = node;
// });

const groupConfig = { gid: "imdbGroup" };
let dataset = [
  { "The Amateur": "https://www.allmovie.com/movie/the-amateur-am612871" },
  {
    "A Minecraft Movie":
      "https://www.allmovie.com/movie/a-minecraft-movie-am125648",
  },
  { "Om Shanti Om": "https://www.allmovie.com/movie/om-shanti-om-am9195" },
  { Parasite: "https://www.allmovie.com/movie/parasite-am209097" },
  { Amélie: "https://www.allmovie.com/movie/am%C3%A9lie-am1047" },
  { "Spirited Away": "https://www.allmovie.com/movie/spirited-away-am4470" },
  { "Pan's Labyrinth": "https://www.allmovie.com/movie/pans-labyrinth-am4" },
  {
    "The Lives of Others":
      "https://www.allmovie.com/movie/the-lives-of-others-am6572",
  },
  { "Star Trek": "https://www.allmovie.com/movie/star-trek-am19526" },
  { Incendies: "https://www.allmovie.com/movie/incendies-am23857" },
  {
    "Slumdog Millionaire":
      "https://www.allmovie.com/movie/slumdog-millionaire-am15508",
  },
  { Tsotsi: "https://www.allmovie.com/movie/tsotsi-am6781" },
  {
    "In the Mood for Love":
      "https://www.allmovie.com/movie/in-the-mood-for-love-am6759",
  },
  {
    "Wings of Desire": "https://www.allmovie.com/movie/wings-of-desire-am6275",
  },
  {
    "Battleship Potemkin":
      "https://www.allmovie.com/movie/battleship-potemkin-am4535",
  },
  {
    "Kuch Kuch Hota Hai":
      "https://www.allmovie.com/movie/kuch-kuch-hota-hai-am35037",
  },
  {
    "Scent of a Woman":
      "https://www.allmovie.com/movie/scent-of-a-woman-am20186",
  },
  {
    "12 Years a Slave":
      "https://www.allmovie.com/movie/12-years-a-slave-am31959",
  },
  { Intolerance: "https://www.allmovie.com/movie/intolerance-am16365" },
  { "The Red Turtle": "https://www.allmovie.com/movie/the-red-turtle-am7919" },
  { "Atomic Blonde": "https://www.allmovie.com/movie/atomic-blonde-am130715" },
  { "The Omen": "https://www.allmovie.com/movie/the-omen-am6720" },
  {
    "Singin' in the Rain":
      "https://www.allmovie.com/movie/singin-in-the-rain-am6785",
  },
  {
    "West Side Story":
      "https://www.allmovie.com/movie/west-side-story-am200156",
  },
  {
    "Silver Linings Playbook":
      "https://www.allmovie.com/movie/silver-linings-playbook-am15308",
  },
  { Avatar: "https://www.allmovie.com/movie/avatar-am3369" },
  { Akira: "https://www.allmovie.com/movie/akira-am729" },
];
let keys = dataset.map((o) => Object.keys(o)[0]);

const visitedUrls = new Set();
const visitedTitles = new Set();
const os = require("os");

// Determine number of CPU cores for optimal threading
const NUM_CPUS = os.cpus().length;
const BATCH_SIZE = 1000; // Adjust based on your dataset size

// Main thread function to split processing across workers
async function processResultsParallel(result, visitedUrlsArray) {
  return new Promise((resolve) => {
    const batches = [];
    const batchSize = Math.ceil(result.length / NUM_CPUS);

    // Split results into batches
    for (let i = 0; i < result.length; i += batchSize) {
      batches.push(result.slice(i, i + batchSize));
    }

    let completedWorkers = 0;
    let combinedResults = [];

    // Create a worker for each batch
    batches.forEach((batch) => {
      const worker = new Worker("./worker.js", {
        workerData: {
          resultBatch: batch,
          visitedUrlsArray: visitedUrlsArray,
        },
      });

      worker.on("message", (newDataset) => {
        combinedResults = combinedResults.concat(newDataset);
        completedWorkers++;

        if (completedWorkers === batches.length) {
          resolve(combinedResults);
        }
      });

      worker.on("error", (err) => {
        console.error("Worker error:", err);
        completedWorkers++;

        if (completedWorkers === batches.length) {
          resolve(combinedResults);
        }
      });
    });
  });
}

async function runIterations(localServer, maxIters = 100) {
  for (let i = 0; i < maxIters; i++) {
    console.log("Starting iteration " + i);
    await new Promise((resolve) => {
      let counter = 0;
      const keys = dataset.map((o) => Object.keys(o)[0]);
      const fs = require("fs");
      const logStream = fs.createWriteStream("log.txt", { flags: "a" });
      logStream.write(`Iteration ${i}:\n`);
      logStream.write("Dataset Size: " + dataset.length + "\n");
      logStream.write("Visited URL Size: " + visitedUrls.size + "\n");

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
              async (err, result) => {
                if (err) {
                  console.error("MapReduce failed:", err);
                  resolve();
                } else {
                  console.log("Processing result in parallel...");

                  // Convert Set to Array for passing to workers
                  const visitedUrlsArray = Array.from(visitedUrls);

                  // Process results in parallel
                  dataset = await processResultsParallel(
                    result,
                    visitedUrlsArray
                  );

                  console.log(
                    `Processed ${result.length} URLs, found ${dataset.length} new URLs`
                  );
                  resolve();
                }
              }
            );
          }
        });
      });
    });
  }
  shutdownAll(localServer);
}

// function startNodes(cb) {
//   const startNext = (index) => {
//     if (index >= nodes.length) return cb();
//     distribution.local.status.spawn(nodes[index], () => startNext(index + 1));
//   };
//   startNext(0);
// }

distribution.node.start((localServer) => {
  console.log("Local node (orchestrator) started");

  // startNodes(() => {
  distribution.local.groups.put(groupConfig, imdbGroup, () => {
    distribution.imdbGroup.groups.put(groupConfig, imdbGroup, () => {
      runIterations(localServer);
    });
  });
  // });
});

// distribution.local.groups.put(groupConfig, imdbGroup, () => {
//   distribution.imdbGroup.groups.put(groupConfig, imdbGroup, () => {
//     runIterations(localServer);
//   });
// });

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
