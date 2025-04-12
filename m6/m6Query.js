const distribution = require("../config.js");
const id = distribution.util.id;

const movieName = process.argv[2];
// console.log("here");
console.log(movieName);

// Define 10 nodes
const nodes = Array.from({ length: 5 }, (_, i) => ({
  ip: "127.0.0.1",
  port: 7110 + i,
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

const kid = id.getID(movieName);
console.log(kid);
console.log(nodeIds);
const nidToGoTo = id.consistentHash(kid, nodeIds);
console.log(nidToGoTo);

// we have the node we want to get to
// send local comm send and then access local-index through sid, then JSON parse, then return the key value pair.
remote = {
  method: "get",
  service: "store",
  node: nidToNode[nidToGoTo],
};
console.log("SID IS: ", id.getSID(nidToNode[nidToGoTo]));
args = {
  key: `local-index-${id.getSID(nidToNode[nidToGoTo])}`,
  gid: "local",
};
console.log(args.key);
global.distribution.local.comm.send(args, remote, (e, v) => {
  if (Object.keys(e).length > 0) {
    console.error("ERROR ERROR ERROR. I HAVE FACED AN ERROR: ", e);
  }
  console.log(v);
});
