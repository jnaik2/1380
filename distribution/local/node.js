const http = require("http");
const url = require("url");
const log = require("../util/log");
const { serialize, deserialize } = require("../util/util");
const { routes } = require("./local");

/*
    The start function will be called to start your node.
    It will take a callback as an argument.
    After your node has booted, you should call the callback.
*/

const start = function (callback) {
  console.log("IM STARTING NODE ");
  const server = http.createServer((req, res) => {
    /* Your server will be listening for PUT requests. */
    // console.log("CREATED SERVER");

    global.moreStatus["counts"]++;
    if (req.method !== "PUT") {
      res.statusCode = 405;
      res.end(serialize(new Error("Method not allowed")));
      return;
    }

    /*
      The path of the http request will determine the service to be used.
      The url will have the form: http://node_ip:node_port/service/method
    */

    // console.log("Paring stuff in node.js");
    // console.log(`Req is ${req}`);

    const urlArr = url.parse(req.url).pathname.split("/");
    const gid = urlArr[urlArr.length - 3];
    const service = urlArr[urlArr.length - 2];
    const method = urlArr[urlArr.length - 1];

    /*

      A common pattern in handling HTTP requests in Node.js is to have a
      subroutine that collects all the data chunks belonging to the same
      request. These chunks are aggregated into a body variable.

      When the req.on('end') event is emitted, it signifies that all data from
      the request has been received. Typically, this data is in the form of a
      string. To work with this data in a structured format, it is often parsed
      into a JSON object using JSON.parse(body), provided the data is in JSON
      format.

      Our nodes expect data in JSON format.
  */

    let body = [];

    req.on("data", (chunk) => {
      body.push(chunk);
    });

    req.on("end", () => {
      /* Here, you can handle the service requests.
      Use the local routes service to get the service you need to call.
      You need to call the service with the method and arguments provided in the request.
      Then, you need to serialize the result and send it back to the caller.
      */
      try {
        // Use a try catch in case the body is not in JSON format
        console.log("IN NODE");
        console.log(`Body is ${body}`);
        const args = deserialize(body.join(""));
        console.log(`Args is ${args}`);
        routes.get({ service: service, gid: gid }, (e1, s) => {
          if (e1) {
            res.statusCode = 404;
            res.end(serialize(e1));
          } else {
            s[method](...args, (e2, r) => {
              res.statusCode = 200;
              res.end(serialize({ e: e2, r: r }));
            });
          }
        });
      } catch (error) {
        res.statusCode = 400;
        res.end(serialize(error));
      }
    });
  });

  /*
    Your server will be listening on the port and ip specified in the config
    You'll be calling the `callback` callback when your server has successfully
    started.

    At some point, we'll be adding the ability to stop a node
    remotely through the service interface.
  */

  server.listen(global.nodeConfig.port, global.nodeConfig.ip, () => {
    log(
      `Server running at http://${global.nodeConfig.ip}:${global.nodeConfig.port}/`
    );
    global.distribution.node.server = server;
    callback(server);
  });

  server.on("error", (error) => {
    // server.close();
    log(`Server error: ${error}`);
    throw error;
  });
};

module.exports = {
  start: start,
};
