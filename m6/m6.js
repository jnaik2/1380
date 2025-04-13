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

    const html = await fetchHTMLWithRetry(url);

    const { JSDOM } = require("jsdom");
    const { URL } = require("url");
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const baseURL = getBaseURL(url);
    fs.writeFileSync("textContent.txt", document.body.innerHTML);
    const bookTitle = document
      .querySelector('td[itemprop="headline"]')
      ?.textContent.trim();
    const bookId = url.match(/\/ebooks\/(\d+)/)?.[1] || "Unknown";
    const downloadsRow = Array.from(document.querySelectorAll("tr")).find(
      (row) => row.querySelector("th")?.textContent === "Downloads"
    );

    let downloadCount = "0";
    let downloadPeriod = "unknown time period";

    if (downloadsRow) {
      const downloadText = downloadsRow.querySelector(
        'td[itemprop="interactionCount"]'
      )?.textContent;
      if (downloadText) {
        // Extract the download count using regex
        const match = downloadText.match(
          /(\d+)\s+downloads in the last (\d+\s+\w+)/i
        );
        if (match) {
          downloadCount = match[1];
          downloadPeriod = match[2];
        } else {
          // If regex fails, just use the raw text
          downloadCount = downloadText.trim();
        }
      }
    }

    // let ratingElement = document.querySelector("div.allmovie-rating");

    // if (!ratingElement) {
    //   console.error("Rating element not found on the page.", url);
    //   callback(new Error("Rating element not found"), null);
    //   return;
    // }

    // const rating = Number(ratingElement.textContent.split(" ")[0]);

    // const moreLikeThis = document.querySelectorAll("a.poster-link");

    // if (moreLikeThis.length === 0) {
    //   console.error("No related books found on the page.");
    //   callback(new Error("No related books found"), null);
    //   return;
    // }

    // const similar = [];

    // moreLikeThis.forEach((link) => {
    //   if (!link) {
    //     console.error("Link is null or undefined");
    //     callback(new Error("Link is null or undefined"), null);
    //     return;
    //   }

    //   if (link.hasAttribute("href")) {
    //     const href = link.getAttribute("href");
    //     const url_slice = new URL(href, baseURL).href;
    //     const title = link.getAttribute("title");

    //     similar.push({
    //       [title]: {
    //         keyUrl: url_slice,
    //         sourceURL: url,
    //         sourceRating: rating,
    //         sourceName: key,
    //       },
    //     });
    //   } else {
    //     console.error("Link without href attribute found:", link);
    //     callback(new Error("Link without href attribute found"), null);
    //     return;
    //   }
    // });

    // callback(null, [similar]);
    // Also extract author for additional context
    const authorElement = document.querySelector('a[rel="marcrel:aut"]');
    const author = authorElement
      ? authorElement.textContent.trim()
      : "Unknown author";

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

    let similarBooks = [];

    // If we have a URL to fetch similar books, do so
    if (similarBooksUrl) {
      console.log(`Fetching similar books from: ${similarBooksUrl}`);

      // Add a delay before making the second request
      await delay(2000 + Math.random() * 3000);

      try {
        // Fetch the similar books page
        const similarBooksHtml = await fetchHTMLWithRetry(similarBooksUrl);

        // Optional: Save the HTML content to a file for debugging if needed
        // fs.writeFileSync("similar-books-debug.txt", similarBooksHtml);

        // Parse the similar books page
        const similarBooksDom = new JSDOM(similarBooksHtml);
        const similarBooksDoc = similarBooksDom.window.document;

        // Extract the list of similar books
        const bookElements = similarBooksDoc.querySelectorAll(".booklink");

        if (bookElements.length > 0) {
          bookElements.forEach((bookElement) => {
            const titleElement = bookElement.querySelector(".title");
            const authorElement = bookElement.querySelector(".subtitle");
            const linkElement = bookElement.querySelector("a");

            if (titleElement && linkElement) {
              const title = titleElement.textContent.trim();
              const author = authorElement
                ? authorElement.textContent.trim()
                : "Unknown";
              const href = linkElement.getAttribute("href");
              const bookUrl = href ? new URL(href, baseURL).href : null;
              const bookIdMatch = bookUrl
                ? bookUrl.match(/\/ebooks\/(\d+)/)
                : null;

              similarBooks.push({
                title: title,
                author: author,
                url: bookUrl,
                id: bookIdMatch ? bookIdMatch[1] : "unknown",
              });
            }
          });
        } else {
          // Alternative selector if .booklink isn't found
          const bookRows = similarBooksDoc.querySelectorAll(
            "li.booklink, li.u-booklink"
          );

          bookRows.forEach((row) => {
            const titleElement = row.querySelector("a");
            const authorElement = row.querySelector("span.subtitle, .author");

            if (titleElement) {
              const title = titleElement.textContent.trim();
              const author = authorElement
                ? authorElement.textContent.trim()
                : "Unknown";
              const href = titleElement.getAttribute("href");
              const bookUrl = href ? new URL(href, baseURL).href : null;
              const bookIdMatch = bookUrl
                ? bookUrl.match(/\/ebooks\/(\d+)/)
                : null;

              similarBooks.push({
                title: title,
                author: author,
                url: bookUrl,
                id: bookIdMatch ? bookIdMatch[1] : "unknown",
              });
            }
          });
        }

        // If we still can't find books with the structured approach,
        // try getting all links that look like book links
        if (similarBooks.length === 0) {
          const possibleBookLinks = Array.from(
            similarBooksDoc.querySelectorAll('a[href*="/ebooks/"]')
          );

          possibleBookLinks.forEach((link) => {
            const href = link.getAttribute("href");
            const bookIdMatch = href.match(/\/ebooks\/(\d+)/);

            if (bookIdMatch) {
              const bookUrl = new URL(href, baseURL).href;

              similarBooks.push({
                title: link.textContent.trim(),
                author: "Unknown",
                url: bookUrl,
                id: bookIdMatch[1],
              });
            }
          });
        }

        console.log(`Found ${similarBooks.length} similar books`);
      } catch (error) {
        console.error("Error fetching similar books:", error);
      }
    }

    // Create the result object
    const result = {
      book: {
        id: bookId,
        title: bookTitle,
        author: author,
        downloads: {
          count: parseInt(downloadCount.replace(/,/g, ""), 10) || 0,
          period: downloadPeriod,
          sourceURL: url,
        },
        similarBooks: similarBooks,
      },
    };

    console.log(`Book ID: ${bookId}, Title: ${bookTitle}`);
    console.log(`Downloads: ${downloadCount} in ${downloadPeriod}`);
    console.log(`Similar books count: ${similarBooks.length}`);
    console.log(`Similar books are: ${JSON.stringify(similarBooks)}`);

    callback(null, [result]);
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

const nodes = Array.from({ length: 1 }, (_, i) => ({
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
let dataset = [{ Frankenstein: "https://www.gutenberg.org/ebooks/84" }];
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
