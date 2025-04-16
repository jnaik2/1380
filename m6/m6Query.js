const config = {
  ip: "127.0.0.1",
  port: 8080,
};
const distribution = require("../distribution.js")(config);
const id = distribution.util.id;
// const Typo = require('typo-js');
// const langCode = 'en_US';
// const dictionary = new Typo(langCode);

function doActualQuery() {
  const movieName = process.argv[2];

  // Define 10 nodes
  const nodes = Array.from({ length: 100 }, (_, i) => ({
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
  console.log(`NidtoGoTo is ${nidToGoTo}`);

  // we have the node we want to get to
  // send local comm send and then access local-index through sid, then JSON parse, then return the key value pair.
  const remote = {
    method: "get",
    service: "store",
    node: nidToNode[nidToGoTo],
  };
  const args = {
    key: `local-index-${id.getSID(nidToNode[nidToGoTo])}`,
    gid: "local",
  };
  console.log(`Remote is ${remote} and args is ${args}`);
  global.distribution.local.comm.send([args], remote, (e, v) => {
    console.log(e);
    if (!v) {
      // const arrayOfSuggestions = dictionary.suggest(movieName);
      console.log(`Nothing was found for ${movieName}`);
      // console.log(`Did you mean: `, arrayOfSuggestions);
      shutdown();
      return;
    }
    // let res = [];
    // for (let i = 0; i < v.length; i++) {
    //   if (v[i][movieName]) {
    //     res = res.concat(v[i][movieName]);
    //   }
    // }
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
    console.log(res);
    console.log("----------------------------------");
    if (res.length === 1) {
      console.log("Reached here");
      console.log(res);
      console.log(res.length);
    } else {
      const sorted = res.sort((a, b) => {
        if (b.sourceRating !== a.sourceRating) {
          return b.sourceRating - a.sourceRating;
        }
        return a.sourceName.localeCompare(b.sourceName);
      });
      console.log(sorted);
      console.log(sorted.length);
    }

    shutdown();
  });
}

doActualQuery();

function shutdown() {
  global.distribution.local.status.stop((e, v) => {
    process.exit(0);
  });
}
