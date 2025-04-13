#!/usr/bin/env node
const distribution = require("../config.js");
const id = distribution.util.id;

// Define the mapper function
// Helper function to fetch HTML content (Refactored to return a Promise)

async function imdbMapper(key, value, callback) {
  const fs = require("fs");
  const url = value;

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function fetchHTML(url) {
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
    // Initial random polite delay
    await delay(500 + Math.random() * 2000);

    // console.log(`URL being passed into fetchHTML is ${url}`);
    const html = await fetchHTMLWithRetry(url);

    const { JSDOM } = require("jsdom");
    const { URL } = require("url");
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const baseURL = getBaseURL(url);
    // fs.writeFileSync("textContent.txt", document.body.innerHTML);
    const bookTitle = document
      .querySelector('td[itemprop="headline"]')
      ?.textContent.trim();
    const bookId = url.match(/\/ebooks\/(\d+)/)?.[1] || "Unknown";

    // Find the downloads count
    const downloadsRow = Array.from(document.querySelectorAll("tr")).find(
      (row) => row.querySelector("th")?.textContent === "Downloads"
    );

    let downloadCount = 0;
    let downloadPeriod = "unknown time period";
    let dayCount = 30; // Default to 30 days if not specified

    if (downloadsRow) {
      const downloadText = downloadsRow.querySelector(
        'td[itemprop="interactionCount"]'
      )?.textContent;
      if (downloadText) {
        // Extract the download count using regex
        const match = downloadText.match(
          /(\d+)\s+downloads in the last (\d+)\s+(\w+)/i
        );
        if (match) {
          downloadCount = parseInt(match[1].replace(/,/g, ""), 10);
          dayCount = parseInt(match[2], 10);
          downloadPeriod = `${match[2]} ${match[3]}`;
        } else {
          // If regex fails, just use the raw text
          downloadCount = parseInt(downloadText.replace(/\D/g, ""), 10) || 0;
        }
      }
    }

    // Calculate rating: downloads per day
    const downloadRating = dayCount > 0 ? downloadCount / dayCount : 0;

    // Also extract author for additional context
    const authorElement = document.querySelector('a[rel="marcrel:aut"]');
    const author = authorElement
      ? authorElement.textContent.trim()
      : "Unknown author";

    // Look for the "Similar Books" header and associated link
    const similarBooksHeader = document.querySelector("h2.header");
    let similarBooksUrl = null;

    if (
      similarBooksHeader &&
      similarBooksHeader.textContent.trim() === "Similar Books"
    ) {
      // Look for a link in a div that follows the header
      const navlinkDiv = similarBooksHeader.nextElementSibling;
      if (navlinkDiv && navlinkDiv.classList.contains("navlink")) {
        const link = navlinkDiv.querySelector("a");
        if (link && link.hasAttribute("href")) {
          const hrefPath = link.getAttribute("href");
          similarBooksUrl = new URL(hrefPath, baseURL).href;
        }
      }
    }

    // If we couldn't find the link, construct it based on the book ID
    if (!similarBooksUrl && bookId !== "Unknown") {
      similarBooksUrl = `${baseURL}/ebooks/${bookId}/also/`;
    }

    let similarBooksOutput = [];

    // If we have a URL to fetch similar books, do so
    if (similarBooksUrl) {
      // console.log(`Fetching similar books from: ${similarBooksUrl}`);

      // Add a delay before making the second request
      await delay(2000 + Math.random() * 3000);

      try {
        // Fetch the similar books page
        const similarBooksHtml = await fetchHTMLWithRetry(similarBooksUrl);

        // Parse the similar books page
        const similarBooksDom = new JSDOM(similarBooksHtml);
        const similarBooksDoc = similarBooksDom.window.document;

        // Extract the list of similar books
        const bookElements = similarBooksDoc.querySelectorAll(".booklink");

        if (bookElements.length > 0) {
          bookElements.forEach((bookElement) => {
            const titleElement = bookElement.querySelector(".title");
            const linkElement = bookElement.querySelector("a");

            if (titleElement && linkElement) {
              const similarBookTitle = titleElement.textContent.trim();
              const href = linkElement.getAttribute("href");
              const similarBookUrl = href ? new URL(href, baseURL).href : null;

              if (similarBookUrl) {
                const outputObject = {
                  [similarBookTitle]: {
                    similarBookUrl: similarBookUrl,
                    originalBookUrl: url,
                    originalBookTitle: bookTitle,
                    originalBookRating: downloadRating,
                  },
                };

                similarBooksOutput.push(outputObject);
              }
            }
          });
        } else {
          // Alternative selector if .booklink isn't found
          const bookRows = similarBooksDoc.querySelectorAll(
            "li.booklink, li.u-booklink"
          );

          bookRows.forEach((row) => {
            const titleElement = row.querySelector("a");

            if (titleElement) {
              const similarBookTitle = titleElement.textContent.trim();
              const href = titleElement.getAttribute("href");
              const similarBookUrl = href ? new URL(href, baseURL).href : null;

              if (similarBookUrl) {
                const outputObject = {
                  [similarBookTitle]: {
                    similarBookUrl: similarBookUrl,
                    originalBookUrl: url,
                    originalBookTitle: bookTitle,
                    originalBookRating: downloadRating,
                  },
                };

                similarBooksOutput.push(outputObject);
              }
            }
          });
        }

        // If we still can't find books with the structured approach,
        // try getting all links that look like book links
        if (similarBooksOutput.length === 0) {
          const possibleBookLinks = Array.from(
            similarBooksDoc.querySelectorAll('a[href*="/ebooks/"]')
          );

          possibleBookLinks.forEach((link) => {
            const href = link.getAttribute("href");
            const bookIdMatch = href.match(/\/ebooks\/(\d+)/);

            if (bookIdMatch) {
              const similarBookTitle = link.textContent.trim();
              const similarBookUrl = new URL(href, baseURL).href;

              const outputObject = {
                [similarBookTitle]: {
                  similarBookUrl: similarBookUrl,
                  originalBookUrl: url,
                  originalBookTitle: bookTitle,
                  originalBookRating: downloadRating,
                },
              };

              similarBooksOutput.push(outputObject);
            }
          });
        }

        console.log(`Found ${similarBooksOutput.length} similar books`);
      } catch (error) {
        console.error("Error fetching similar books:", error);
      }
    }

    // console.log(`Book ID: ${bookId}, Title: ${bookTitle}`);
    // console.log(`Downloads: ${downloadCount} in ${downloadPeriod}`);
    // console.log(`Rating (downloads per day): ${downloadRating}`);
    // console.log(`Similar books count: ${similarBooksOutput.length}`);
    // console.log(`similarBooksOutput is: `, JSON.stringify(similarBooksOutput));

    // Return the array of similar books in the requested format
    callback(null, [similarBooksOutput]);
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
// let dataset = [
//   { "The Amateur": "https://www.allmovie.com/movie/the-amateur-am612871" },
//   {
//     "A Minecraft Movie":
//       "https://www.allmovie.com/movie/a-minecraft-movie-am125648",
//   },
//   { "Om Shanti Om": "https://www.allmovie.com/movie/om-shanti-om-am9195" },
// ];
let dataset = [
  {
    "Frankenstein; Or, The Modern Prometheus by Mary Wollstonecraft Shelley":
      "https://www.gutenberg.org/ebooks/84",
  },
  {
    "Crime and Punishment by Fyodor Dostoyevsky":
      "https://www.gutenberg.org/ebooks/2554",
  },
  {
    "Alice's Adventures in Wonderland by Lewis Carroll":
      "https://www.gutenberg.org/ebooks/11",
  },
  {
    "Romeo and Juliet by William Shakespeare":
      "https://www.gutenberg.org/ebooks/1513",
  },
  {
    "The trail of the serpent by M. E. Braddon":
      "https://www.gutenberg.org/ebooks/75840",
  },
  {
    "De jongfryske biweging by Douwe Kalma":
      "https://www.gutenberg.org/ebooks/75842",
  },
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
                    // console.log(value);
                    const key = Object.keys(value)[0];
                    const keyUrl = value[key][0].similarBookUrl;
                    // const name = value[key][0].name;

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
