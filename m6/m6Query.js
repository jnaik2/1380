const config = {
  ip: "127.0.0.1",
  port: 8080,
};
const distribution = require("../distribution.js")(config);
const id = distribution.util.id;

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

  // we have the node we want to get to
  // send local comm send and then access local-index through sid, then JSON parse, then return the key value pair.
  remote = {
    method: "get",
    service: "store",
    node: nidToNode[nidToGoTo],
  };
  args = {
    key: `local-index-${id.getSID(nidToNode[nidToGoTo])}`,
    gid: "local",
  };
  console.log(`Remote is ${remote} and args is ${args}`);
  global.distribution.local.comm.send([args], remote, (e, v) => {
    if (!v) {
      console.log(`Nothing was found for ${movieName}`);
      shutdown();
      return;
    }
    let res;
    for (let i = 0; i < v.length; i++) {
      if (v[i][movieName]) {
        res = v[i][movieName];
        break;
      }
    }
    const sorted = res.sort((a, b) => {
      if (b.sourceRating !== a.sourceRating) {
        return b.sourceRating - a.sourceRating;
      }
      return a.sourceName.localeCompare(b.sourceName);
    });
    console.log(sorted);
    shutdown();
  });
}

doActualQuery();

function shutdown() {
  global.distribution.local.status.stop((e, v) => {
    process.exit(0);
  });
}
