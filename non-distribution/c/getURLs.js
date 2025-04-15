#!/usr/bin/env node
const https = require("https");
const { JSDOM } = require("jsdom");

// A simple delay function that returns a Promise
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to fetch HTML of a given URL using HTTPS
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      // Check for a 503 Service Unavailable
      if (response.statusCode === 503) {
        return reject({
          retryable: true,
          statusCode: 503,
          message: `503 Service Unavailable: ${url}`,
        });
      }
      // Check for any non-200 status code
      if (response.statusCode !== 200) {
        return reject(
          new Error(
            `Failed to load page, status code: ${response.statusCode}. Url: ${url}`
          )
        );
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

// A helper that attempts to fetch the HTML with a simple retry mechanism
async function fetchHTMLWithRetry(url, attempts = 3) {
  const randomDelay = Math.random() * 5000; // delay up to 5 seconds
  try {
    return await fetchHTML(url);
  } catch (err) {
    if ((err.retryable && err.statusCode === 503) && attempts > 0) {
      console.warn(`Fetch failed, retrying (attempt #${4 - attempts}): ${url}`);
      // Exponential backoff delay
      const delayTime = Math.random() * Math.pow(2, 3 - attempts) * 1000;
      await delay(delayTime + randomDelay);
      return fetchHTMLWithRetry(url, attempts - 1);
    } else {
      throw err;
    }
  }
}

// Main function that extracts movie info and related URLs.
// It returns a callback with a result whose key is a JSON-stringified object
// containing the original URL and rating, and whose value is an array of related URLs.
async function extractIMDbInfo(url, callback) {
  try {
    // Introduce an initial random delay (politeness)
    const initialDelay = Math.random() * 5000;
    await delay(initialDelay);

    // Fetch the HTML content with retry
    const html = await fetchHTMLWithRetry(url);

    // Parse the HTML content using JSDOM
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract the rating element from the page
    const ratingElement = document.querySelector("div.allmovie-rating");
    if (!ratingElement) {
      callback(new Error("Rating element not found for this url: " + url), null);
      return;
    }
    // Expect the rating to be the first token in the text content
    const rating = Number(ratingElement.textContent.split(" ")[0]);

    // Establish a base URL for resolving relative URLs
    const parsedURL = new URL(url);
    const baseURL = `${parsedURL.protocol}//${parsedURL.host}`;

    // Extract related movie links using the 'a.poster-link' selector
    const moreLikeThis = document.querySelectorAll("a.poster-link");
    if (moreLikeThis.length === 0) {
      // If no related links found, call the callback with an empty list.
      // (Alternatively, you could treat this as an error.)
      callback(new Error("No related movies found for this url: " + url), null);
      return;
    }

    // Create an array of related URLs
    const relatedUrls = [];
    moreLikeThis.forEach((link) => {
      if (!link) {
        console.error("Link is null or undefined");
        return;
      }
      const href = link.getAttribute("href");
      // Resolve relative URLs using the base URL
      const fullUrl = new URL(href, baseURL).href;
      relatedUrls.push(fullUrl);
    });

    // Create the key as a JSON-stringified object with url and rating
    const result = relatedUrls.map(nextUrl => ({
      [nextUrl]: {
        source_url: url,
        source_rating: rating
      }
    }));
    // Return the result where the value is the array of related URLs
    callback(null, result);
  } catch (error) {
    console.error("Error fetching or processing HTML:", error);
    callback(error, null);
  }
}

module.exports.extractIMDbInfo = extractIMDbInfo;
