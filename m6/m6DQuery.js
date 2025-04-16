const config = {
  ip: "127.0.0.1",
  port: 8080,
};
const distribution = require("../distribution.js")(config);
const id = distribution.util.id;
const Typo = require("typo-js");
const lang_code = "en_US";
const dictionary = new Typo(lang_code);

function doActualQuery() {
  const movieName = process.argv[2];

  // Define 10 nodes
  // const nodes = Array.from({ length: 100 }, (_, i) => ({
  //   ip: "127.0.0.1",
  //   port: 7310 + i,
  // }));
  const nodes = [];
  const n1 = { ip: "3.145.76.237", port: 1234 };
  nodes.push(n1);
  const n2 = { ip: "3.149.213.219", port: 1234 };
  nodes.push(n2);
  const n3 = { ip: "3.144.19.33", port: 1234 };
  nodes.push(n3);
  const n4 = { ip: "18.227.0.115", port: 1234 };
  nodes.push(n4);
  const n5 = { ip: "3.144.42.193", port: 1234 };
  nodes.push(n5);
  const n6 = { ip: "3.128.87.180", port: 1234 };
  nodes.push(n6);
  const n7 = { ip: "13.58.20.60", port: 1234 };
  nodes.push(n7);
  const n8 = { ip: "3.135.186.61", port: 1234 };
  nodes.push(n8);
  const n9 = { ip: "3.140.196.218", port: 1234 };
  nodes.push(n9);
  const n10 = { ip: "3.15.141.223", port: 1234 };
  nodes.push(n10);
  const n11 = { ip: "18.118.139.89", port: 1234 };
  nodes.push(n11);
  const n12 = { ip: "18.119.143.44", port: 1234 };
  nodes.push(n12);

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
    method: "awsGet",
    service: "store",
    node: nidToNode[nidToGoTo],
  };
  args = {
    key: `local-index-${id.getSID(nidToNode[nidToGoTo])}`,
    gid: "local",
  };
  console.log(`Remote is ${remote} and args is ${args}`);
  global.distribution.local.comm.send([args], remote, (e, v) => {
    console.log("Possible error is: ", e);
    if (!v) {
      const array_of_suggestions = dictionary.suggest(movieName);
      console.log(`Nothing was found for ${movieName}`);
      console.log(`Did you mean: `, array_of_suggestions);
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
