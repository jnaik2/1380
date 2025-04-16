const config = {
  ip: "127.0.0.1",
  port: 8080,
};
const distribution = require("../distribution.js")(config);
const id = distribution.util.id;
const Typo = require("typo-js");
const langCode = "en_US";
const dictionary = new Typo(langCode);

const t1 = performance.now();
const movieName = process.argv[2];
tryAllSuggestions(movieName);

function tryAllSuggestions(originalMovieName) {
  const t1 = performance.now();
  const suggestions = [
    originalMovieName,
    ...dictionary.suggest(originalMovieName),
  ];
  console.log(`Trying all suggestions: ${suggestions.join(", ")}`);

  let index = 0;

  function tryNext() {
    if (index >= suggestions.length) {
      console.log("No results found for any suggestion.");
      shutdown();
      return;
    }

    const suggestion = suggestions[index++];
    console.log(`Trying "${suggestion}"...`);
    doActualQuery(suggestion, tryNext);
  }

  tryNext();
}

function doActualQuery(movieName, onFailure) {
  const nodes = Array.from({ length: 50 }, (_, i) => ({
    ip: "127.0.0.1",
    port: 7310 + i,
  }));

  const nodeIds = [];
  const nidToNode = [];
  nodes.forEach((node) => {
    const nid = id.getNID(node);
    nodeIds.push(nid);
    nidToNode[nid] = node;
  });

  const kid = id.getID("mr-shuffle-" + movieName);
  const nidToGoTo = id.consistentHash(kid, nodeIds);
  const remote = {
    method: "get",
    service: "store",
    node: nidToNode[nidToGoTo],
  };

  const args = {
    key: `local-index-${id.getSID(nidToNode[nidToGoTo])}`,
    gid: "local",
  };

  global.distribution.local.comm.send([args], remote, (e, v) => {
    console.log(e);
    if (!v) {
      console.log(`No result for "${movieName}"`);
      return onFailure();
    }

    let res = [];
    const seen = new Set();

    v.forEach((entry) => {
      const results = entry[movieName];
      if (results) {
        results.forEach((item) => {
          if (!seen.has(item.sourceURL)) {
            seen.add(item.sourceURL);
            res.push(item);
          }
        });
      }
    });

    if (res.length === 0) {
      console.log(`No data for "${movieName}"`);
      return onFailure();
    }

    console.log("----------------------------------");
    if (res.length === 1) {
      console.log("Single result:");
      console.log(res);
    } else {
      const sorted = res.sort((a, b) => {
        if (b.sourceRating !== a.sourceRating) {
          return b.sourceRating - a.sourceRating;
        }
        return a.sourceName.localeCompare(b.sourceName);
      });
      console.log("Multiple results (sorted):");
      console.log(sorted);
    }

    shutdown();
  });
}

function shutdown() {
  const t2 = performance.now();
  const latency = t2 - t1;
  console.log("Time taken to iterate query: ", latency);
  global.distribution.local.status.stop((e, v) => {
    process.exit(0);
  });
}
