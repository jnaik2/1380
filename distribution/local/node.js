const WebSocket = require('ws');
const url = require('url');
const log = require('../util/log');
const {serialize, deserialize} = require('../util/util');
const {routes} = require('./local');

/*
    The start function will be called to start your node.
    It will take a callback as an argument.
    After your node has booted, you should call the callback.
*/

const start = function(callback) {
  const wss = new WebSocket.Server({
    host: global.nodeConfig.ip,
    port: global.nodeConfig.port,
  });

  // Handle connections
  wss.on('connection', (res, req) => {
    /* Your server will be listening for PUT requests. */
    global.moreStatus['counts']++;
    // if (req.method !== 'PUT') {
    //   console.log(req);
    //   res.statusCode = 405;
    //   res.send(serialize({e: new Error('Method not allowed'), r: null}));
    //   return;
    // }


    // Parse the URL to extract service information
    const urlPath = url.parse(req.url).pathname;
    const urlArr = urlPath.split('/');
    const gid = urlArr[urlArr.length - 3];
    const service = urlArr[urlArr.length - 2];
    const method = urlArr[urlArr.length - 1];

    res.on('message', (message) => {
      let x;
      let args;
      try {
        // Deserialize the message
        args = deserialize(message.toString());
        console.log(`Args in node is ${JSON.stringify(args)}`);
        console.log(`Service is ${service} and method is ${method}`);

        // Get the service
        routes.get({service: service, gid: gid}, (e1, s) => {
          if (e1) {
            // Service not found
            console.log('reached here: ', e1);
            res.send(serialize({e: e1, r: {}}));
          } else {
            // console.log("Reached here: ", s);
            x = s;
            if ('results' in args) {
              args = [args];
            }

            if ('nameToRemove' in args) {
              console.log(`Removing in nameToRemove ${args.nameToRemove} from ${args.gid}`);
              args = [args];
            }

            // Call the method on the service
            s[method](...args, (e2, r) => {
              // console.log("ERROR ERRROR ERROR");
              // console.log(e2);
              // console.log(r);
              res.send(serialize({e: e2, r: r}));
            });
          }
        });
      } catch (error) {
        console.log(x, method, `ABCDE`, args);
        console.log(x[method], `AMDOMOAM`, args);
        res.send(serialize({e: error, r: {}}));
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
  wss.on('listening', () => {
    log(
        `WebSocket server running at ws://${global.nodeConfig.ip}:${global.nodeConfig.port}/`,
    );
    global.distribution.node.server = wss;
    callback(wss);
  });

  // Handle errors
  wss.on('error', (error) => {
    log(`WebSocket server error: ${error}`);
    throw error;
  });
};

module.exports = {
  start: start,
};
