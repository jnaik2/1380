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
    // Await the HTML fetch
    // console.log('Starting HTML fetch...');
    const html = await fetchHTML(url);
    // console.log('IN THE THEN PART');

    const { JSDOM } = require("jsdom");
    const { URL } = require("url");
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const baseURL = getBaseURL(url);
    const seenMovies = new Set();

    let ratingElement =
      document.querySelector("span.sc-d541859f-1.imUuxf") ||
      document.querySelector(
        '[data-testid="hero-rating-bar__aggregate-rating__score"] span'
      ) ||
      document.querySelector(".ratings_wrapper .rating span");

    if (!ratingElement) {
      const spans = document.querySelectorAll("span");
      for (const span of spans) {
        const text = span.textContent.trim();
        if (/^\d+\.\d+(\s*\/\s*10)?$/.test(text)) {
          ratingElement = span;
          break;
        }
      }
    }

    const rating = ratingElement ? ratingElement.textContent.trim() : "N/A";
    // console.log(`Found rating: ${rating}`);

    let moreLikeThisMovies = document.querySelectorAll(
      "a.ipc-poster-card__title"
    );

    if (moreLikeThisMovies.length === 0) {
      moreLikeThisMovies = document.querySelectorAll(
        '[data-testid="MoreLikeThis"] a'
      );
    }

    if (moreLikeThisMovies.length === 0) {
      const headings = document.querySelectorAll("h2, h3");
      for (const heading of headings) {
        if (
          /More like this|Similar movies|You may also like/i.test(
            heading.textContent
          )
        ) {
          let section = heading.nextElementSibling;
          while (section && !section.querySelectorAll) {
            section = section.nextElementSibling;
          }
          if (section) {
            moreLikeThisMovies = section.querySelectorAll('a[href*="/title/"]');
          }
          break;
        }
      }
    }

    // console.log(`Found ${moreLikeThisMovies.length} similar movies`);
    const similarMovies = [];

    const finalResult = [];
    moreLikeThisMovies.forEach((link) => {
      if (link.hasAttribute("href")) {
        const href = link.getAttribute("href");
        if (href.includes("/title/")) {
          const titleMatch = href.match(/\/title\/(tt\d+)/);
          if (titleMatch) {
            const titleId = titleMatch[1];
            if (!seenMovies.has(titleId)) {
              seenMovies.add(titleId);
              const fullUrl = new URL(href, baseURL).href;
              let movieTitle =
                link.getAttribute("aria-label") || link.textContent.trim();
              movieTitle = movieTitle.replace("View title page for ", "");
              //   similarMovies.push({
              //     url: fullUrl,
              //     name: movieTitle,
              // //   });
              //   similarMovies.push({url: fullUrl});

              url_slice = fullUrl.substring(0, fullUrl.lastIndexOf("/"));
              finalResult.push({
                [movieTitle]: {
                  keyUrl: url_slice,
                  sourceURL: url,
                  sourceRating: rating,
                  sourceName: key,
                },
              });
            }
          }
        }
      }
    });

    // console.log(`Returning result for ${url}:`, finalResult);
    callback(null, [finalResult]); // Use callback to signal completion with the result
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
  // console.log("IN REDUCER");
  // console.log(key);
  // console.log(values);
  return { [key]: values };
};

// Define 10 nodes
const nodes = Array.from({ length: 5 }, (_, i) => ({
  ip: "127.0.0.1",
  port: 7110 + i,
}));

const imdbGroup = {};
nodes.forEach((node) => {
  imdbGroup[id.getSID(node)] = node;
});

const groupConfig = { gid: "imdbGroup" };
let dataset = [{ "Kung Fu Panda 3": "https://www.imdb.com/title/tt2267968" }];
// const dataset = [{ "Mickey 17": "https://www.imdb.com/title/tt12299608" }];
let keys = dataset.map((o) => Object.keys(o)[0]);

let iteration = 0;
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

const visitedUrls = new Set();
const visitedTitles = new Set();

async function runIterations(localServer, maxIters = 10) {
  for (let i = 0; i < 10; i++) {
    console.log("Iteration:", i);
    // console.log(dataset);
    // console.log("Visited URLs:", visitedUrls);
    console.log("Visited Titles:", visitedTitles);

    await new Promise((resolve) => {
      let counter = 0;
      keys = dataset.map((o) => Object.keys(o)[0]);
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
                for (const value of result) {
                  console.log(value);
                }
                // console.log("we just MRed this", JSON.stringify(result));
                // console.log("we visited this", visitedUrls);
                if (err) {
                  console.error("MapReduce failed:", err);
                } else {
                  // console.log("MapReduce result:", JSON.stringify(result));
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
        //
        let counter = 0;
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

// kp2: kp1 this means that kp1 points to kp2

// i thought we want to reeturn all movies that point to that moviegit
