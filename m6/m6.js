#!/usr/bin/env node
const distribution = require("../config.js");
const id = distribution.util.id;

// Define the mapper function
// Helper function to fetch HTML content (Refactored to return a Promise)

// 1. Request Queue with Rate Limiting Implementation
// class RequestQueue {
//   constructor(options = {}) {
//     this.queue = [];
//     this.running = 0;
//     this.concurrency = options.concurrency || 3;
//     this.interval = options.interval || 1000;
//     this.lastRequestTime = 0;
//     this.domainTimers = {}; // Track time of last request per domain
//     this.perDomainInterval = options.perDomainInterval || 2000; // Min ms between requests to same domain
//   }

//   add(url, taskFn) {
//     return new Promise((resolve, reject) => {
//       const hostname = new URL(url).hostname;
//       this.queue.push({ url, hostname, taskFn, resolve, reject });
//       this.process();
//     });
//   }

//   async process() {
//     if (this.running >= this.concurrency || this.queue.length === 0) {
//       return;
//     }

//     // Find the next task we can run based on domain timers
//     const now = Date.now();
//     let taskIndex = -1;

//     for (let i = 0; i < this.queue.length; i++) {
//       const { hostname } = this.queue[i];
//       const lastRequestToThisDomain = this.domainTimers[hostname] || 0;
//       if (now - lastRequestToThisDomain >= this.perDomainInterval) {
//         taskIndex = i;
//         break;
//       }
//     }

//     // If no suitable task was found, wait and try again
//     if (taskIndex === -1) {
//       const minWaitTime = Math.min(
//         ...Object.entries(this.domainTimers)
//           .map(([domain, time]) => this.perDomainInterval - (now - time))
//           .filter((t) => t > 0)
//       );

//       setTimeout(() => this.process(), minWaitTime || 100);
//       return;
//     }

//     // Get the next task and run it
//     const { url, hostname, taskFn, resolve, reject } = this.queue.splice(
//       taskIndex,
//       1
//     )[0];
//     this.running++;

//     // Ensure minimum time between overall requests
//     const timeSinceLastRequest = now - this.lastRequestTime;
//     if (timeSinceLastRequest < this.interval) {
//       await new Promise((r) =>
//         setTimeout(r, this.interval - timeSinceLastRequest)
//       );
//     }

//     // Update timers and run the task
//     this.lastRequestTime = Date.now();
//     this.domainTimers[hostname] = Date.now();

//     try {
//       const result = await taskFn();
//       resolve(result);
//     } catch (error) {
//       reject(error);
//     } finally {
//       this.running--;
//       setTimeout(() => this.process(), 0); // Process next item
//     }
//   }
// }

// 2. Improved HTTP Request Function
// function fetchHTML(url, options = {}) {
//   const https = require("https");
//   const http = require("http");
//   const zlib = require("zlib");

//   // Rotate user agents for each request
//   const userAgents = [
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
//     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
//     "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0",
//     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/113.0",
//   ];

//   // Prepare the headers with better request management
//   const headers = {
//     "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
//     Accept:
//       "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
//     "Accept-Language": "en-US,en;q=0.5",
//     "Accept-Encoding": "gzip, deflate, br",
//     DNT: "1",
//     Connection: "keep-alive",
//     "Upgrade-Insecure-Requests": "1",
//     "Sec-Fetch-Dest": "document",
//     "Sec-Fetch-Mode": "navigate",
//     "Sec-Fetch-Site": "none",
//     "Sec-Fetch-User": "?1",
//     "Cache-Control": "max-age=0",
//     ...options.headers,
//   };

//   // Parse the URL to determine if it's HTTP or HTTPS
//   const isHttps = url.startsWith("https:");
//   const client = isHttps ? https : http;
//   const urlObj = new URL(url);

//   // Prepare the request options
//   const requestOptions = {
//     hostname: urlObj.hostname,
//     path: urlObj.pathname + urlObj.search,
//     method: "GET",
//     headers,
//     timeout: options.timeout || 15000,
//     // Create a new agent for each request with keep-alive settings
//     agent: new client.Agent({
//       keepAlive: true,
//       keepAliveMsecs: 1000,
//       maxSockets: 10,
//       maxFreeSockets: 5,
//       timeout: 60000,
//     }),
//   };

//   return new Promise((resolve, reject) => {
//     const req = client.request(requestOptions, (res) => {
//       // Handle redirects
//       if (
//         res.statusCode === 301 ||
//         res.statusCode === 302 ||
//         res.statusCode === 307 ||
//         res.statusCode === 308
//       ) {
//         const redirectUrl = res.headers.location;
//         if (!redirectUrl) {
//           reject(
//             new Error(
//               `Redirect with no location header. Status: ${res.statusCode}`
//             )
//           );
//           return;
//         }

//         // Handle relative redirects
//         const absoluteUrl = redirectUrl.startsWith("http")
//           ? redirectUrl
//           : new URL(redirectUrl, url).href;

//         // Check for redirect loops
//         if (options.redirectCount && options.redirectCount > 5) {
//           reject(new Error(`Too many redirects for ${url}`));
//           return;
//         }

//         // Follow the redirect with a slight delay
//         setTimeout(() => {
//           fetchHTML(absoluteUrl, {
//             ...options,
//             redirectCount: (options.redirectCount || 0) + 1,
//           })
//             .then(resolve)
//             .catch(reject);
//         }, 500);
//         return;
//       }

//       // Handle rate limiting (429 Too Many Requests)
//       if (res.statusCode === 429) {
//         const retryAfter = parseInt(res.headers["retry-after"], 10) || 60;
//         const retryTime = retryAfter * 1000;

//         console.warn(
//           `Rate limited on ${url}. Retrying after ${retryAfter} seconds.`
//         );

//         setTimeout(() => {
//           fetchHTML(url, options).then(resolve).catch(reject);
//         }, retryTime);
//         return;
//       }

//       // Check for other error status codes
//       if (res.statusCode !== 200) {
//         reject(
//           new Error(
//             `Failed to load page, status code: ${res.statusCode}. Url: ${url}`
//           )
//         );
//         return;
//       }

//       // Check if the response is compressed
//       const encoding = res.headers["content-encoding"];
//       let responseStream = res;

//       if (encoding === "gzip") {
//         responseStream = res.pipe(zlib.createGunzip());
//       } else if (encoding === "deflate") {
//         responseStream = res.pipe(zlib.createInflate());
//       } else if (encoding === "br") {
//         responseStream = res.pipe(zlib.createBrotliDecompress());
//       }

//       // Collect the response data
//       const chunks = [];
//       responseStream.on("data", (chunk) => chunks.push(chunk));

//       responseStream.on("end", () => {
//         const buffer = Buffer.concat(chunks);
//         const html = buffer.toString("utf8");

//         // Check for anti-scraping techniques
//         if (
//           html.includes("captcha") ||
//           html.includes("CAPTCHA") ||
//           html.includes("Access Denied") ||
//           html.includes("DDoS protection")
//         ) {
//           reject(
//             new Error(`Possible anti-scraping protection detected for ${url}`)
//           );
//           return;
//         }

//         resolve(html);
//       });
//     });

//     // Handle network errors
//     req.on("error", (err) => {
//       reject(err);
//     });

//     // Handle timeouts
//     req.on("timeout", () => {
//       req.destroy();
//       reject(new Error(`Request timed out after ${requestOptions.timeout}ms`));
//     });

//     // Send the request
//     req.end();
//   });
// }

// 3. Enhanced retry functionality with exponential backoff
// async function fetchHTMLWithRetry(url, options = {}) {
//   const maxAttempts = options.maxAttempts || 3;
//   const initialDelay = options.initialDelay || 2000;
//   const backoffFactor = options.backoffFactor || 2;
//   const jitter = options.jitter || 0.2; // 20% randomness

//   let attempt = 1;
//   let lastError;

//   while (attempt <= maxAttempts) {
//     try {
//       return await fetchHTML(url, options);
//     } catch (err) {
//       lastError = err;

//       // Don't retry on certain error types
//       if (
//         err.message &&
//         (err.message.includes("403") ||
//           err.message.includes("Forbidden") ||
//           err.message.includes("anti-scraping") ||
//           err.message.includes("captcha") ||
//           err.message.includes("CAPTCHA"))
//       ) {
//         console.error(`Scraping blocked for ${url}: ${err.message}`);
//         throw err;
//       }

//       // Last attempt - give up
//       if (attempt >= maxAttempts) {
//         console.error(`Failed after ${maxAttempts} attempts for ${url}`);
//         throw err;
//       }

//       // Calculate delay with exponential backoff and jitter
//       const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
//       const randomFactor = 1 - jitter + Math.random() * jitter * 2;
//       const actualDelay = Math.floor(delay * randomFactor);

//       console.warn(
//         `Attempt ${attempt}/${maxAttempts} failed for ${url}. Retrying in ${actualDelay}ms. Error: ${err.message}`
//       );

//       // Wait before retrying
//       await new Promise((resolve) => setTimeout(resolve, actualDelay));
//       attempt++;
//     }
//   }

//   throw lastError;
// }

// 4. Modify the mapper function to use the queue
async function imdbMapper(key, value, callback) {
  function fetchHTML(url, options = {}) {
    const https = require("https");
    const http = require("http");
    const zlib = require("zlib");

    // Rotate user agents for each request
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/113.0",
    ];

    // Prepare the headers with better request management
    const headers = {
      "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
      ...options.headers,
    };

    // Parse the URL to determine if it's HTTP or HTTPS
    const isHttps = url.startsWith("https:");
    const client = isHttps ? https : http;
    const urlObj = new URL(url);

    // Prepare the request options
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers,
      timeout: options.timeout || 15000,
      // Create a new agent for each request with keep-alive settings
      agent: new client.Agent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 60000,
      }),
    };

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        // Handle redirects
        if (
          res.statusCode === 301 ||
          res.statusCode === 302 ||
          res.statusCode === 307 ||
          res.statusCode === 308
        ) {
          const redirectUrl = res.headers.location;
          if (!redirectUrl) {
            reject(
              new Error(
                `Redirect with no location header. Status: ${res.statusCode}`
              )
            );
            return;
          }

          // Handle relative redirects
          const absoluteUrl = redirectUrl.startsWith("http")
            ? redirectUrl
            : new URL(redirectUrl, url).href;

          // Check for redirect loops
          if (options.redirectCount && options.redirectCount > 5) {
            reject(new Error(`Too many redirects for ${url}`));
            return;
          }

          // Follow the redirect with a slight delay
          setTimeout(() => {
            fetchHTML(absoluteUrl, {
              ...options,
              redirectCount: (options.redirectCount || 0) + 1,
            })
              .then(resolve)
              .catch(reject);
          }, 500);
          return;
        }

        // Handle rate limiting (429 Too Many Requests)
        if (res.statusCode === 429) {
          const retryAfter = parseInt(res.headers["retry-after"], 10) || 60;
          const retryTime = retryAfter * 1000;

          console.warn(
            `Rate limited on ${url}. Retrying after ${retryAfter} seconds.`
          );

          setTimeout(() => {
            fetchHTML(url, options).then(resolve).catch(reject);
          }, retryTime);
          return;
        }

        // Check for other error status codes
        if (res.statusCode !== 200) {
          reject(
            new Error(
              `Failed to load page, status code: ${res.statusCode}. Url: ${url}`
            )
          );
          return;
        }

        // Check if the response is compressed
        const encoding = res.headers["content-encoding"];
        let responseStream = res;

        if (encoding === "gzip") {
          responseStream = res.pipe(zlib.createGunzip());
        } else if (encoding === "deflate") {
          responseStream = res.pipe(zlib.createInflate());
        } else if (encoding === "br") {
          responseStream = res.pipe(zlib.createBrotliDecompress());
        }

        // Collect the response data
        const chunks = [];
        responseStream.on("data", (chunk) => chunks.push(chunk));

        responseStream.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const html = buffer.toString("utf8");

          // Check for anti-scraping techniques
          if (
            html.includes("captcha") ||
            html.includes("CAPTCHA") ||
            html.includes("Access Denied") ||
            html.includes("DDoS protection")
          ) {
            reject(
              new Error(`Possible anti-scraping protection detected for ${url}`)
            );
            return;
          }

          resolve(html);
        });
      });

      // Handle network errors
      req.on("error", (err) => {
        reject(err);
      });

      // Handle timeouts
      req.on("timeout", () => {
        req.destroy();
        reject(
          new Error(`Request timed out after ${requestOptions.timeout}ms`)
        );
      });

      // Send the request
      req.end();
    });
  }

  async function fetchHTMLWithRetry(url, options = {}) {
    const maxAttempts = options.maxAttempts || 3;
    const initialDelay = options.initialDelay || 2000;
    const backoffFactor = options.backoffFactor || 2;
    const jitter = options.jitter || 0.2; // 20% randomness

    let attempt = 1;
    let lastError;

    while (attempt <= maxAttempts) {
      try {
        return await fetchHTML(url, options);
      } catch (err) {
        lastError = err;

        // Don't retry on certain error types
        if (
          err.message &&
          (err.message.includes("403") ||
            err.message.includes("Forbidden") ||
            err.message.includes("anti-scraping") ||
            err.message.includes("captcha") ||
            err.message.includes("CAPTCHA"))
        ) {
          console.error(`Scraping blocked for ${url}: ${err.message}`);
          throw err;
        }

        // Last attempt - give up
        if (attempt >= maxAttempts) {
          console.error(`Failed after ${maxAttempts} attempts for ${url}`);
          throw err;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
        const randomFactor = 1 - jitter + Math.random() * jitter * 2;
        const actualDelay = Math.floor(delay * randomFactor);

        console.warn(
          `Attempt ${attempt}/${maxAttempts} failed for ${url}. Retrying in ${actualDelay}ms. Error: ${err.message}`
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, actualDelay));
        attempt++;
      }
    }

    throw lastError;
  }

  const fs = require("fs");
  const url = value;

  class RequestQueue {
    constructor(options = {}) {
      this.queue = [];
      this.running = 0;
      this.concurrency = options.concurrency || 3;
      this.interval = options.interval || 1000;
      this.lastRequestTime = 0;
      this.domainTimers = {}; // Track time of last request per domain
      this.perDomainInterval = options.perDomainInterval || 2000; // Min ms between requests to same domain
    }

    add(url, taskFn) {
      return new Promise((resolve, reject) => {
        const hostname = new URL(url).hostname;
        this.queue.push({ url, hostname, taskFn, resolve, reject });
        this.process();
      });
    }

    async process() {
      if (this.running >= this.concurrency || this.queue.length === 0) {
        return;
      }

      // Find the next task we can run based on domain timers
      const now = Date.now();
      let taskIndex = -1;

      for (let i = 0; i < this.queue.length; i++) {
        const { hostname } = this.queue[i];
        const lastRequestToThisDomain = this.domainTimers[hostname] || 0;
        if (now - lastRequestToThisDomain >= this.perDomainInterval) {
          taskIndex = i;
          break;
        }
      }

      // If no suitable task was found, wait and try again
      if (taskIndex === -1) {
        const minWaitTime = Math.min(
          ...Object.entries(this.domainTimers)
            .map(([domain, time]) => this.perDomainInterval - (now - time))
            .filter((t) => t > 0)
        );

        setTimeout(() => this.process(), minWaitTime || 100);
        return;
      }

      // Get the next task and run it
      const { url, hostname, taskFn, resolve, reject } = this.queue.splice(
        taskIndex,
        1
      )[0];
      this.running++;

      // Ensure minimum time between overall requests
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.interval) {
        await new Promise((r) =>
          setTimeout(r, this.interval - timeSinceLastRequest)
        );
      }

      // Update timers and run the task
      this.lastRequestTime = Date.now();
      this.domainTimers[hostname] = Date.now();

      try {
        const result = await taskFn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        this.running--;
        setTimeout(() => this.process(), 0); // Process next item
      }
    }
  }

  // Create a domain-aware request queue
  const requestQueue = new RequestQueue({
    concurrency: 3,
    interval: 1000,
    perDomainInterval: 3000, // 3 seconds between requests to the same domain
  });

  try {
    // Initial request through the queue
    const html = await requestQueue.add(url, () =>
      fetchHTMLWithRetry(url, {
        maxAttempts: 3,
        initialDelay: 2000,
      })
    );

    // Process HTML (your existing code)
    const { JSDOM } = require("jsdom");
    const { URL } = require("url");
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const baseURL = new URL(url).origin;

    // Extract book information (your existing code)
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

    // Look for similar books URL
    const similarBooksHeader = document.querySelector("h2.header");
    let similarBooksUrl = null;

    if (
      similarBooksHeader &&
      similarBooksHeader.textContent.trim() === "Similar Books"
    ) {
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

    // If we have a URL to fetch similar books, do so using the queue
    if (similarBooksUrl) {
      try {
        // Fetch the similar books page through the queue
        const similarBooksHtml = await requestQueue.add(similarBooksUrl, () =>
          fetchHTMLWithRetry(similarBooksUrl, {
            maxAttempts: 2,
            initialDelay: 2000,
          })
        );

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
                similarBooksOutput.push({
                  [similarBookTitle]: {
                    similarBookUrl: similarBookUrl,
                    originalBookUrl: url,
                    originalBookTitle: bookTitle,
                    originalBookRating: downloadRating,
                  },
                });
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
                similarBooksOutput.push({
                  [similarBookTitle]: {
                    similarBookUrl: similarBookUrl,
                    originalBookUrl: url,
                    originalBookTitle: bookTitle,
                    originalBookRating: downloadRating,
                  },
                });
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

              similarBooksOutput.push({
                [similarBookTitle]: {
                  similarBookUrl: similarBookUrl,
                  originalBookUrl: url,
                  originalBookTitle: bookTitle,
                  originalBookRating: downloadRating,
                },
              });
            }
          });
        }

        console.log(
          `Found ${similarBooksOutput.length} similar books for "${bookTitle}"`
        );
      } catch (error) {
        console.error(
          `Error fetching similar books for ${url}:`,
          error.message
        );
      }
    }

    // Return the array of similar books in the requested format
    callback(null, [similarBooksOutput]);
  } catch (error) {
    console.error(`Error processing ${url}:`, error.message);
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
