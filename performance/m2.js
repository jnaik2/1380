#!/usr/bin/env node
const distribution = require("../distribution");
let localServer;
distribution.node.start((server) => {
  localServer = server;
});

function measureComm() {
  const distribution = require("../distribution");

  const startTime = Date.now();
  const node = distribution.node.config;
  const remote = { node: node, service: "status", method: "get" };
  const message = ["port"];

  let completedRequests = 0;
  for (let i = 0; i < 1000; i++) {
    distribution.local.comm.send(message, remote, (e, v) => {
      completedRequests++;
      if (completedRequests === 1000) {
        const endTime = Date.now();
        let latency = (endTime - startTime) / 1000;
        console.log(`Average Comm Latency: ${latency} ms`);
        console.log(`Comm Throughput: ${(1000 * 1) / latency} requests/second`);
        localServer.close();
      }
    });
  }
}

function measureRPC() {
  const distribution = require("@brown-ds/distribution");
  const util = distribution.util;
  let n = 0;
  const addOne = () => {
    return ++n;
  };

  const node = { ip: "127.0.0.1", port: 1380 };

  let addOneRPC = util.wire.createRPC(util.wire.toAsync(addOne));

  const rpcService = {
    addOne: addOneRPC,
  };

  distribution.local.comm.send(
    [rpcService, "addOneService"],
    { node: node, service: "routes", method: "put" },
    (e, v) => {
      let startTime = Date.now();
      let completedRequests = 0;
      for (let i = 0; i < 1000; i++) {
        distribution.local.comm.send(
          [],
          { node: node, service: "addOneService", method: "addOne" },
          (e, v) => {
            completedRequests++;
            if (completedRequests === 1000) {
              let endTime = Date.now();
              let latency = (endTime - startTime) / 1000;
              console.log(`Average RPC Latency: ${latency} ms`);
              console.log(
                `RPC Throughput: ${(1000 * 1) / latency} requests/second`
              );
              localServer.close();
            }
          }
        );
      }
    }
  );
}

if (process.argv[2] == "comm") {
  measureComm();
} else if (process.argv[2] == "rpc") {
  measureRPC();
}
