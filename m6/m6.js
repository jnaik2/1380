#!/usr/bin/env node
const distribution = require('../config.js');
const id = distribution.util.id;

// Define the mapper function
// Helper function to fetch HTML content (Refactored to return a Promise)

async function imdbMapper(key, value, callback) {
  const url = value;

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function fetchHTML(url) {
<<<<<<< Updated upstream
    const https = require("https");

    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/112.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/14.1.2 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/113.0.0.0 Safari/537.36",
    ];

    const headers = {
      "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      Connection: "keep-alive",
    };

    return new Promise((resolve, reject) => {
      const request = https.get(url, { headers }, (response) => {
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

      request.setTimeout(10000, () => {
        request.abort();
        reject(new Error("Request timed out"));
      });
=======
    const https = require('https');
    return new Promise((resolve, reject) => {
      // Introduce a random delay between 1 and 5 seconds
      const delay = Math.floor(Math.random() * 1000) + 5000; // Random delay in milliseconds
      setTimeout(() => {
        https
            .get(url, (response) => {
              if (response.statusCode !== 200) {
                reject(
                    new Error(
                        `Failed to load page, status code: ${response.statusCode}`,
                    ),
                );
                return;
              }

              let data = '';
              response.on('data', (chunk) => {
                data += chunk;
              });
              response.on('end', () => {
                resolve(data);
              });
            })
            .on('error', (err) => {
              reject(err);
            });
      }, delay); // Apply the random delay here
>>>>>>> Stashed changes
    });
  }

  async function fetchHTMLWithRetry(url, attempts = 2) {
    try {
      return await fetchHTML(url);
    } catch (err) {
      if (attempts > 1) {
        console.warn(`Fetch failed, retrying after long delay... (${url})`);
        // Delay more significantly before retrying
        await delay(20000 + Math.pow(Math.random(), 2) * 100000);
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
<<<<<<< Updated upstream
    // Initial random polite delay
    await delay(500 + Math.random() * 2000);

    const html = await fetchHTMLWithRetry(url);
=======
    // Await the HTML fetch
    // console.log('Starting HTML fetch...');
    console.error(url);
    const html = await fetchHTML(url);
    // console.log('IN THE THEN PART');
>>>>>>> Stashed changes

    const {JSDOM} = require('jsdom');
    const {URL} = require('url');
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const baseURL = getBaseURL(url);

<<<<<<< Updated upstream
    let ratingElement = document.querySelector("div.allmovie-rating");

    if (!ratingElement) {
      console.error("Rating element not found on the page.", url);
      callback(new Error("Rating element not found"), null);
      return;
    }

    const rating = Number(ratingElement.textContent.split(" ")[0]);

    const moreLikeThis = document.querySelectorAll("a.poster-link");

    if (moreLikeThis.length === 0) {
      console.error("No related books found on the page.");
      callback(new Error("No related books found"), null);
      return;
    }

    const similar = [];

    moreLikeThis.forEach((link) => {
      if (!link) {
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

    callback(null, [similar]);
=======
    const ratingElement = document.querySelector('.user_score_chart');

    // Check if the element exists and retrieve the 'data-percent' attribute
    const rating = ratingElement ?
      ratingElement.getAttribute('data-percent') :
      'N/A';

    const finalResult = [];

    const movieLinks = document.querySelectorAll('a[href*="/movie/"][title]');

    console.error('Movie links found:');
    // console.error(movieLinks.length);
    console.error(JSON.stringify(movieLinks));

    movieLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const title = link.getAttribute('title');

      if (!seenMovies.has(href)) {
        seenMovies.add(href);
        const fullUrl = new URL(href, baseURL).href;
        finalResult.push({
          [title]: {
            keyUrl: fullUrl.substring(0, fullUrl.lastIndexOf('/')),
            sourceURL: fullUrl,
            sourceRating: rating,
            sourceName: key, // Replace with your source name
          },
        });
      }
    });

    console.error('Final result:');
    console.error(finalResult);

    // console.log(`Returning result for ${url}:`, finalResult);
    callback(null, [finalResult]); // Use callback to signal completion with the result
>>>>>>> Stashed changes
  } catch (error) {
    console.error('Error fetching or processing HTML:', error);
    callback(null, [
      {
        [JSON.stringify({url: url, rating: 'N/A'})]: [],
      },
    ]);
  }
}

const reducer = (key, values) => {
<<<<<<< Updated upstream
  return { [key]: values };
};

const nodes = Array.from({ length: 100 }, (_, i) => ({
  ip: "127.0.0.1",
=======
  // console.log("IN REDUCER");
  // console.log(key);
  // console.log(values);
  return {[key]: values};
};

// Define 10 nodes
const nodes = Array.from({length: 5}, (_, i) => ({
  ip: '127.0.0.1',
>>>>>>> Stashed changes
  port: 7110 + i,
}));

const imdbGroup = {};
nodes.forEach((node) => {
  imdbGroup[id.getSID(node)] = node;
});

<<<<<<< Updated upstream
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

=======
const groupConfig = {gid: 'imdbGroup'};
let dataset = [
  {Novocaine: 'https://www.themoviedb.org/movie/1195506-novocaine'},
];
let keys = dataset.map((o) => Object.keys(o)[0]);

const iteration = 0;
const maxIterations = 10;

// function runMapReduceLoop(localServer) {
//   console.log(`\n=== Running MapReduce Iteration ${iteration + 1} ===`);
//   distribution.imdbGroup.mr.exec(
//     { keys: keys, map: imdbMapper, reduce: reducer },
//     (err, result) => {
//       if (err) {
//         console.error("MapReduce failed:", err);
//       } else {
//         console.log("MapReduce result:");
//         for (const key in result) {
//           console.log(key, result[key]);
//         }
//       }

//       iteration++;
//       if (iteration < maxIterations) {
//         runMapReduceLoop(); // run the next iteration
//       } else {
//         shutdownAll(localServer); // done
//       }
//     }
//   );
// }

>>>>>>> Stashed changes
const visitedUrls = new Set();
const visitedTitles = new Set();

async function runIterations(localServer, maxIters = 10) {
  for (let i = 0; i < 10; i++) {
<<<<<<< Updated upstream
    console.log("Iteration:", i);
    // Change this to log to a file instead of the console
=======
    console.log('Iteration:', i);
    // console.log(dataset);
    // console.log("Visited URLs:", visitedUrls);
    console.log('Visited Titles:', visitedTitles);
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
              { keys: keys, map: imdbMapper, reduce: reducer },
              (err, result) => {
                if (err) {
                  console.error("MapReduce failed:", err);
                } else {
                  dataset = [];

=======
                {keys: keys, map: imdbMapper, reduce: reducer},
                (err, result) => {
>>>>>>> Stashed changes
                  for (const value of result) {
                    console.log(value);
                  }
                  // console.log("we just MRed this", JSON.stringify(result));
                  // console.log("we visited this", visitedUrls);
                  if (err) {
                    console.error('MapReduce failed:', err);
                  } else {
                  // console.log("MapReduce result:", JSON.stringify(result));
                    dataset = [];

                    for (const value of result) {
                      const key = Object.keys(value)[0];
                      const keyUrl = value[key][0].keyUrl;
                      const name = value[key][0].name;

                      if (!visitedUrls.has(keyUrl)) {
                        dataset.push({[key]: keyUrl});
                      }
                    }
                  }

                  resolve();
                },
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
  console.log('Local node (orchestrator) started');

  startNodes(() => {
    distribution.local.groups.put(groupConfig, imdbGroup, () => {
      distribution.imdbGroup.groups.put(groupConfig, imdbGroup, () => {
<<<<<<< Updated upstream
=======
        //
        const counter = 0;
        // for (let i = 0; i < 2; i++) {
        //   console.log("index is: ", i);
        //   dataset.forEach((entry) => {
        //     const key = Object.keys(entry)[0];
        //     const value = entry[key];
        //     distribution.imdbGroup.store.put(value, key, () => {
        //       counter++;
        //       if (counter === dataset.length) {
        //         distribution.imdbGroup.mr.exec(
        //           { keys: keys, map: imdbMapper, reduce: reducer },
        //           (err, result) => {
        //             if (err) {
        //               console.error("MapReduce failed:", err);
        //             } else {
        //               console.log("MapReduce result: ", JSON.stringify(result));
        //               dataset = [];
        //               for (const value of result) {
        //                 console.log("Outer loop key is: ", value);
        //                 // const indexResults = result[key];
        //                 // console.log("Result key is: ", result[key])
        //                 console.log("CHECKING");
        //                 const key = Object.keys(value);
        //                 // console.log(keys);
        //                 // console.log(value[keys[0]][0].keyUrl);
        //                 const keyUrl = value[key[0]][0].keyUrl;

        //                 if (!visitedUrls.has(keyUrl)) {
        //                   visitedUrls.add(keyUrl);
        //                   dataset.push({ key: keyUrl });
        //                 }

        //                 // for (const k of Object.keys(value)) {
        //                 //   console.log("Name inner loop: ", k);
        //                 //   const keyURL = value[k].keyUrl;

        //                 // }
        //                 // loop over result[key]
        //                 // extract keyUrl and sourceName
        //                 // add to visited set
        //                 // in next iteration, convert visited set to arrahy and pass that in as keys
        //                 // console.log("key is: ", key);
        //                 // console.log("Result is: ", result[key]);
        //               }
        //             }
        //             // Shutdown all nodes
        //             console.log("IM SHUTTING IT with index: ", i);
        //             if (i == 1) {
        //               shutdownAll(localServer);
        //             }
        //           }
        //         );
        //         // runMapReduceLoop(localServer);
        //       }
        //     });
        //   });
        // }
>>>>>>> Stashed changes
        runIterations(localServer);
      });
    });
  });
});

function shutdownAll(localServer) {
  const remote = {service: 'status', method: 'stop'};

  const stopNext = (index) => {
    if (index >= nodes.length) {
      localServer.close();
      console.log('All nodes stopped and local server closed.');
      return;
    }

    remote.node = nodes[index];
    distribution.local.comm.send([], remote, () => stopNext(index + 1));
  };

  stopNext(0);
}
