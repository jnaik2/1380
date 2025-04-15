const config = {
  ip: "127.0.0.1",
  port: 8080,
};
const distribution = require("../distribution.js")(config);
const id = distribution.util.id;

function doActualQuery() {
  const movieName = process.argv[2];
  // console.log("here");
  // console.log(movieName);

  // Define 10 nodes
  const nodes = Array.from({ length: 100 }, (_, i) => ({
    ip: "127.0.0.1",
    port: 7310 + i,
  }));

  // const imdbGroup = {};
  const nodeIds = [];
  const nidToNode = [];
  nodes.forEach((node) => {
    const nid = id.getNID(node);
    nodeIds.push(nid);
    nidToNode[nid] = node;
    //   imdbGroup[id.getSID(node)] = node;
  });

  const kid = id.getID("mr-shuffle-" + movieName);
  // console.log(kid);
  // console.log(nodeIds);
  const nidToGoTo = id.consistentHash(kid, nodeIds);
  // console.log(nidToGoTo);

  // we have the node we want to get to
  // send local comm send and then access local-index through sid, then JSON parse, then return the key value pair.
  remote = {
    method: "get",
    service: "store",
    node: nidToNode[nidToGoTo],
  };
  // console.log("SID IS: ", id.getSID(nidToNode[nidToGoTo]));
  args = {
    key: `local-index-${id.getSID(nidToNode[nidToGoTo])}`,
    gid: "local",
  };
  console.log(`Remote is ${remote} and args is ${args}`);
  global.distribution.local.comm.send(args, remote, (e, v) => {
    if (Object.keys(e).length > 0) {
      console.error("ERROR ERROR ERROR. I HAVE FACED AN ERROR: ", e);
    }
    console.log(e, v);
    shutdown();
  });
}

// const node = { ip: "127.0.0.1", port: 9009 };
// function startNodes(cb) {
//   // const startNext = (index) => {
//   //   if (index >= nodes.length) return cb();
//   //   distribution.local.status.spawn(nodes[index], () => startNext(index + 1));
//   // };
//   // startNext(0);
//   distribution.local.status.spawn(node, () => {
//     console.log("local query nodes started for real");
//   });
// }

// distribution.node.start((localServer) => {
//   console.log("Query node started");

//   startNodes(() => {
//     console.log("Connected to node network");
//     doActualQuery(localServer);
//   });
// });

doActualQuery();

// distribution.node.start((localServer) => {
//   console.log("Local node (orchestrator) started");

//   startNodes(() => {
//     doActualQuery(localServer);
//   });
// });

function shutdown() {
  // console.log("Shutting down query node...");
  // localServer.close(() => {
  //   console.log("Query node shutdown complete");
  //   process.exit(0);
  // });
  global.distribution.local.status.stop((e, v) => {
    process.exit(0);
  });
}
