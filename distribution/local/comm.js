/** @typedef {import("../types").Callback} Callback */
/** @typedef {import("../types").Node} Node */

const WebSocket = require('ws');
const {serialize, deserialize} = require('../util/util');


/**
 * @typedef {Object} Target
 * @property {string} service
 * @property {string} method
 * @property {Node} node
 */

// cache to store connections. saw this online somewhere
const connections = new Map();

/**
 * Get or create a WebSocket connection
 * @param {string} url - The WebSocket URL
 * @return {Promise<WebSocket>} - A promise that resolves to a WebSocket connection
 */
function getConnection(url) {
  return new Promise((resolve, reject) => {
    if (connections.has(url) && connections.get(url).readyState === WebSocket.OPEN) { // check if cache hit
      resolve(connections.get(url));
      return;
    }

    const ws = new WebSocket(url);

    ws.on('open', () => {
      connections.set(url, ws); // add to cache
      resolve(ws);
    });

    ws.on('error', (err) => {
      reject(new Error(`WebSocket connection error: ${err.message}`)); // hopefully we dont hit it
    });
  });
}

/**
 * @param {Array} message
 * @param {Target} remote
 * @param {Callback} [callback]
 * @return {void}
 */
function send(message, remote, callback) {
  const callBack = callback || console.log;

  if (!remote) {
    callBack(new Error('Remote not specified'), null);
    return;
  }
  if (!remote.node) {
    callBack(new Error('Node not specified'), null);
    return;
  }
  if (!remote.node.ip) {
    callBack(new Error('Node IP not specified'), null);
    return;
  }
  if (!remote.service) {
    callBack(new Error('Service not specified'), null);
    return;
  }
  if (!remote.method) {
    callBack(new Error('Method not specified'), null);
    return;
  }
  
  let pathPrefix = '/local';

  if (remote.gid) {
    pathPrefix = `/${remote.gid}`;
  }

  const wsUrl = `ws://${remote.node.ip}:${remote.node.port}${pathPrefix}/${remote.service}/${remote.method}`; // neeed to add this otherwise get ENOTFOUND error

  // console.log(`In comm, message before serializing is ${JSON.stringify(message)}`);
  const serializedMessage = serialize(message);
  // console.log(`In comm, serializedMessage is ${serializedMessage}, and deserializing it gives us ${Object.values(JSON.parse(serializedMessage))}`);

  getConnection(wsUrl)
      .then((ws) => {
        // similar to on(data) for http
        const messageHandler = (data) => {
          try {
            // console.log('Response is: ', data);
            const response = deserialize(data.data.toString());
            // console.log('Response is: ', response);
            if (response.e !== null && response.e !== undefined && response.e != {}) {
              // console.log("Reach this case");
              // need this weird if statement otherwise we dont catch a weird edge case
              if (Object.keys(response.e).length > 0) {
                callBack(response.e, null);
              } else {
                callBack(response.e, response.r);
              }
              // callback(response.e, response.r);
            } else {
              // console.log("Result is: ", response.r);
              callBack(null, response.r);
            }
            // callback(response.e, response.r); // need to return both otherwise tests scream
            // Remove the listener once we've processed the response
            ws.removeEventListener('message', messageHandler);
          } catch (error) {
            callBack(error, null);
            ws.removeEventListener('message', messageHandler);
          }
        };

        // need to add event listener
        ws.addEventListener('message', messageHandler);

        // finally send
        ws.send(serializedMessage);
      })
      .catch((err) => {
        callBack(err, null);
      });
}

module.exports = {send};
