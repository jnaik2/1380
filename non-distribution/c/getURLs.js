#!/usr/bin/env node

const https = require('https');
const {JSDOM} = require('jsdom');
const {URL} = require('url');

// get html content from page
function fetchHTML(url, callback) {
  console.log('Getting content from url: ', url);
  https.get(url, (response) => { // use https to get html
    if (response.statusCode !== 200) {
      callback(new Error(`Failed to load page, status code: ${response.statusCode}`));
      return;
    }


    // similar to our original comm

    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => callback(null, data));
  }).on('error', (err) => {
    callback(err);
  });
}

function getBaseURL(url) {
  const parsedURL = new URL(url);
  return `${parsedURL.protocol}//${parsedURL.host}`;
}

function extractIMDbInfo(url, callback) {
  callback = callback || function() {};
  fetchHTML(url, (err, html) => {
    if (err) {
      return callback(err);
    }

    // similar to our original getURLS.js
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const baseURL = getBaseURL(url);
    const seenMovies = new Set();

    // get rating of current url
    // try all possible class names I saw on various IMDB sites
    let ratingElement = document.querySelector('span.sc-d541859f-1.imUuxf') ||
                        document.querySelector('[data-testid="hero-rating-bar__aggregate-rating__score"] span') ||
                        document.querySelector('.ratings_wrapper .rating span');

    // try looking at all spans and looking for ratings followed by / 10 or smthing
    if (!ratingElement) {
      const spans = document.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent.trim();
        if (/^\d+\.\d+(\s*\/\s*10)?$/.test(text)) {
          ratingElement = span;
          break;
        }
      }
    }

    const rating = ratingElement ? ratingElement.textContent.trim() : 'N/A';

    // get more like this
    let moreLikeThisMovies = document.querySelectorAll('a.ipc-poster-card__title');

    // try another one
    if (moreLikeThisMovies.length === 0) {
      moreLikeThisMovies = document.querySelectorAll('[data-testid="MoreLikeThis"] a');
    }

    // if still nothing, try going for all h2 and h3 and searchin for similar section titles

    if (moreLikeThisMovies.length === 0) {
      const headings = document.querySelectorAll('h2, h3');
      for (const heading of headings) {
        if (/More like this|Similar movies|You may also like/i.test(heading.textContent)) {
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

    const similarMovies = [];

    // go through each movie
    moreLikeThisMovies.forEach((link) => {
      if (link.hasAttribute('href')) {
        const href = link.getAttribute('href'); // get link
        if (href.includes('/title/')) {
          const titleMatch = href.match(/\/title\/(tt\d+)/); // gets title context (/title/tconst)
          if (titleMatch) {
            const titleId = titleMatch[1]; // get actual tconst
            // console.log(titleMatch);
            // console.log(titleId);
            if (!seenMovies.has(titleId)) { // avoid duplicates (although this shouldnt' ever happen)?
              seenMovies.add(titleId);
              const fullUrl = new URL(href, baseURL).href; // use base url so that we dont use relative urls
              let movieTitle = link.getAttribute('aria-label') || link.textContent.trim(); // get movie title
              movieTitle = movieTitle.replace('View title page for ', ''); // replace the IMDB text with our text
              similarMovies.push({
                url: fullUrl,
                name: movieTitle,
              });
            }
          }
        }
      }
    });

    // have key as url, rating and then jsonify it

    const objKey = JSON.stringify({url: url, rating: rating});
    const result = {
      [objKey]: similarMovies,
    };

    callback(null, result);
  });
}

module.exports = {
  extractIMDbInfo,
};
