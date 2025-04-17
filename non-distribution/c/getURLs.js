#!/usr/bin/env node

// const https = require('https');
// const {JSDOM} = require('jsdom');
// const {URL} = require('url');

async function imdbMapper(key, value, callback) {
  const randomDelay = Math.random() * 5000;
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
        console.warn(
          `Fetch failed, retrying (try #${numTry} after long delay... (${url})`
        );
        // Try exponential backoff delay
        const delayTime = Math.random() * Math.pow(5, 6 - attempts) * 1000;
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

module.exports = {
  imdbMapper,
};
