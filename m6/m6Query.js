const config = {
  ip: '127.0.0.1',
  port: 8080,
};
const distribution = require('../distribution.js')(config);
const id = distribution.util.id;
const Typo = require('typo-js');
const langCode = 'en_US';
const dictionary = new Typo(langCode);

function doActualQuery(movieName) {
  // Define 10 nodes
  const nodes = Array.from({length: 50}, (_, i) => ({
    ip: '127.0.0.1',
    port: 7310 + i,
  }));

  const nodeIds = [];
  const nidToNode = [];
  nodes.forEach((node) => {
    const nid = id.getNID(node);
    nodeIds.push(nid);
    nidToNode[nid] = node;
  });

  const kid = id.getID('mr-shuffle-' + movieName);
  const nidToGoTo = id.consistentHash(kid, nodeIds);
  console.log(`NidtoGoTo is ${nidToGoTo}`);

  // we have the node we want to get to
  // send local comm send and then access local-index through sid, then JSON parse, then return the key value pair.
  const remote = {
    method: 'get',
    service: 'store',
    node: nidToNode[nidToGoTo],
  };
  const args = {
    key: `local-index-${id.getSID(nidToNode[nidToGoTo])}`,
    gid: 'local',
  };
  console.log(`Remote is ${remote} and args is ${args}`);
  global.distribution.local.comm.send([args], remote, (e, v) => {
    console.log(e);
    if (!v) {
      const arrayOfSuggestions = dictionary.suggest(movieName);
      console.log(`Nothing was found for ${movieName}`);
      console.log(`Did you mean: `, arrayOfSuggestions);
      shutdown();
      return;
    }
    // let res = [];
    // for (let i = 0; i < v.length; i++) {
    //   if (v[i][movieName]) {
    //     res = res.concat(v[i][movieName]);
    //   }
    // }
    const res = [];
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
    // console.log(res);
    // console.log("----------------------------------");
    if (res.length === 1) {
      console.log(
          '----------------------------------------------------------------',
      );
      console.log(
          `RECOMMENDATION FOR: ${movieName}\nURL: ${res[0].keyUrl}`,
      );
      console.log(`\nRecommendation: ${res[0].sourceName}`);
      console.log(
          `Rating: ${res[0].sourceRating}\nURL: ${res[0].sourceURL}`,
      );
      console.log(`1 RECOMMENDATION FOUND`);
      console.log(
          '-----------------------------------------------------------------',
      );
    } else {
      const sorted = res.sort((a, b) => {
        if (b.sourceRating !== a.sourceRating) {
          return b.sourceRating - a.sourceRating;
        }
        return a.sourceName.localeCompare(b.sourceName);
      });
      console.log(
          '----------------------------------------------------------------',
      );
      console.log(
          `RECOMMENDATIONS FOR ${movieName}\nURL: ${sorted[0].keyUrl}`,
      );
      for (let i = 0; i < sorted.length; i++) {
        console.log(`\nRecommendation ${i + 1}: ${sorted[i].sourceName}`);
        console.log(
            `Rating: ${sorted[i].sourceRating}\nURL: ${sorted[i].sourceURL}`,
        );
      }
      console.log(`${sorted.length} RECOMMENDATIONS FOUND`);
      console.log(
          '-----------------------------------------------------------------',
      );
    }
    shutdown();
  });
}

const t1 = performance.now();
const movieName = process.argv[2];
doActualQuery(movieName);

function shutdown() {
  const t2 = performance.now();
  const latency = t2 - t1;
  console.log('Time taken to normal query: ', latency);
  global.distribution.local.status.stop((e, v) => {
    process.exit(0);
  });
}
