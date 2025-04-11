const distribution = require('../config.js');
const id = distribution.util.id;

// Define the mapper function
// Helper function to fetch HTML content (Refactored to return a Promise)

async function imdbMapper(key, value, callback) {
  console.log(`imdbMapper called with key=${key}, value=${value}`);

  // Use dependencies passed from the MapReduce framework
  const url = value;

  // Helper function to fetch HTML content (Refactored to return a Promise)
  function fetchHTML(url) {
    const https = require('https');
    return new Promise((resolve, reject) => {
    //   console.log('Getting content from url: ', url);
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to load page, status code: ${response.statusCode}`));
          return;
        }

        let data = '';
        response.on('data', (chunk) => {
        //   console.log('GETTING DATA');
          data += chunk;
        });
        response.on('end', () => {
        //   console.log('GOT ALL DATA');
          resolve(data);
        });
      }).on('error', (err) => {
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

    const {JSDOM} = require('jsdom');
    const {URL} = require('url');
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const baseURL = getBaseURL(url);
    const seenMovies = new Set();

    let ratingElement = document.querySelector('span.sc-d541859f-1.imUuxf') ||
                        document.querySelector('[data-testid="hero-rating-bar__aggregate-rating__score"] span') ||
                        document.querySelector('.ratings_wrapper .rating span');

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
    console.log(`Found rating: ${rating}`);

    let moreLikeThisMovies = document.querySelectorAll('a.ipc-poster-card__title');

    if (moreLikeThisMovies.length === 0) {
      moreLikeThisMovies = document.querySelectorAll('[data-testid="MoreLikeThis"] a');
    }

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

    console.log(`Found ${moreLikeThisMovies.length} similar movies`);
    const similarMovies = [];

    moreLikeThisMovies.forEach((link) => {
      if (link.hasAttribute('href')) {
        const href = link.getAttribute('href');
        if (href.includes('/title/')) {
          const titleMatch = href.match(/\/title\/(tt\d+)/);
          if (titleMatch) {
            const titleId = titleMatch[1];
            if (!seenMovies.has(titleId)) {
              seenMovies.add(titleId);
              const fullUrl = new URL(href, baseURL).href;
              let movieTitle = link.getAttribute('aria-label') || link.textContent.trim();
              movieTitle = movieTitle.replace('View title page for ', '');
              similarMovies.push({
                url: fullUrl,
                name: movieTitle,
              });
            }
          }
        }
      }
    });

    const objKey = JSON.stringify({url: url, rating: rating});
    const result = {
      [objKey]: similarMovies,
    };

    console.log(`Returning result for ${url}:`, result);
    callback(null, [result]); // Use callback to signal completion with the result
  } catch (error) {
    console.error('Error fetching or processing HTML:', error);
    callback(null, [{
      [JSON.stringify({url: url, rating: 'N/A'})]: [],
    }]);
  }
}

const reducer = (key, values) => {
  return {[key]: values};
};

// Define 10 nodes
const nodes = Array.from({length: 10}, (_, i) => ({
  ip: '127.0.0.1',
  port: 7110 + i,
}));

const imdbGroup = {};
nodes.forEach((node) => {
  imdbGroup[id.getSID(node)] = node;
});

const groupConfig = {gid: 'imdbGroup'};
const dataset = [{'imdb': 'https://www.imdb.com/title/tt12299608'}];
const keys = dataset.map((o) => Object.keys(o)[0]);

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
        let counter = 0;
        dataset.forEach((entry) => {
          const key = Object.keys(entry)[0];
          const value = entry[key];
          distribution.imdbGroup.store.put(value, key, () => {
            counter++;
            if (counter === dataset.length) {
              distribution.imdbGroup.mr.exec({keys: keys, map: imdbMapper, reduce: reducer}, (err, result) => {
                if (err) {
                  console.error('MapReduce failed:', err);
                } else {
                  console.log('MapReduce result:', result);
                }
                // Shutdown all nodes
                shutdownAll(localServer);
              });
            }
          });
        });
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


