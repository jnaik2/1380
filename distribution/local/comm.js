/** @typedef {import("../types").Callback} Callback */
/** @typedef {import("../types").Node} Node */

const http = require("node:http");
const { serialize, deserialize } = require("../util/util");

/**
 * @typedef {Object} Target
 * @property {string} service
 * @property {string} method
 * @property {Node} node
 */

/**
 * @param {Array} message
 * @param {Target} remote
 * @param {Callback} [callback]
 * @return {void}
 */
function send(message, remote, callback) {
  console.log("IM COMMING IT 2");
  const callBack = callback || console.log;
  console.log(`Remote is ${JSON.stringify(remote)}`);
  if (!remote) {
    callBack(new Error("Remote not specified"), null);
    return;
  }
  if (!remote.node) {
    callBack(new Error("Node not specified"), null);
    return;
  }
  if (!remote.node.ip) {
    callBack(new Error("Node IP not specified"), null);
    return;
  }
  if (!remote.service) {
    callBack(new Error("Service not specified"), null);
    return;
  }
  if (!remote.method) {
    callBack(new Error("Method not specified"), null);
    return;
  }
  let pathPrefix = "/local";

  if (remote.gid) {
    pathPrefix = `/${remote.gid}`;
  }

  const postData = serialize(message);
  console.log(`Serialized message is ${postData}`);
  const options = {
    hostname: remote.node.ip,
    port: remote.node.port,
    path: `${pathPrefix}/${remote.service}/${remote.method}`,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = http.request(options, (res) => {
    const body = [];
    res.on("data", (chunk) => {
      body.push(chunk);
    });
    res.on("end", () => {
      try {
        // console.log("Reached end");
        // console.log(`Body is ${body}`);
        const data = deserialize(body.join(""));
        // console.log(`Data is ${data}`);
        if (res.statusCode != 200) {
          callBack(data, null);
        } else {
          const err = data.e;
          const res = data.r;
          callBack(err, res);
        }
      } catch (error) {
        callBack(error, null);
      }
    });
  });

  req.on("error", (err) => {
    callBack(new Error(err), null);
  });

  req.write(postData);
  req.end();
}

module.exports = { send };
