/** @typedef {import("../types").Callback} Callback */

const {id} = require('../util/util');

/**
 * Map functions used for mapreduce
 * @callback Mapper
 * @param {any} key
 * @param {any} value
 * @returns {object[]}
 */

/**
 * Reduce functions used for mapreduce
 * @callback Reducer
 * @param {any} key
 * @param {Array} value
 * @returns {object}
 */

/**
 * @typedef {Object} MRConfig
 * @property {Mapper} map
 * @property {Reducer} reduce
 * @property {string[]} keys
 */


/*
  Note: The only method explicitly exposed in the `mr` service is `exec`.
  Other methods, such as `map`, `shuffle`, and `reduce`, should be dynamically
  installed on the remote nodes and not necessarily exposed to the user.
*/

function mr(config) {
  const context = {
    gid: config.gid || 'all',
  };

  /**
   * @param {MRConfig} configuration
   * @param {Callback} cb
   * @return {void}
   */
  function exec(configuration, cb) {
    // Setup

    // Map
    const mapMethod = (keys, gid, mapFunc, callback) => {
      // Loop over keys
      const results = [];
      for (const key of keys) {
        global.distribution[gid].local.store.get(key, (e, v) => {
          results.push(mapFunc(key, v));
          global.distribution[gid].local.store.put(v, {key: key, gid: gid}, (e, v) => {
            if (results.length === keys.length) {
              // notify orchestrator
              callback(null, results);
            }
          });
        });
      }
    };

    // Shuffle
    const shuffleMethod = (keys, gid, shuffleFunc, callback) => { };

    // Reduce
    const reduceMethod = (keys, gid, reduceFunc, callback) => { };

    // Clean up
    const cleanupMethod = () => { };

    const notifyMethod = (object) => {
      
    };

    // Invocation
    const mrServiceObject = {
      map: mapMethod,
      shuffle: shuffleMethod,
      reduce: reduceMethod,
      cleanup: cleanupMethod,
    };
    const mrServiceName = `mr-${id.getNID(global.nodeConfig)}`;
    const keys = configuration.keys;
    global.distribution[context.gid].routes.put(mrServiceObject, mrServiceName, (eMap, responseMap) => {
      global.distribution.local.groups.get(context.gid, (e, group) => {
        const nodes = Object.values(group);
        const nids = nodes.map((node) => id.getNID(node));

        const nidsToKeys = {};
        for (const key of keys) {
          const keyID = id.getID(key);
          const nid = id.consistentHash(keyID, nids);
          if (nidsToKeys[nid]) {
            nidsToKeys[nid].push(keyID);
          } else {
            nidsToKeys[nid] = [keyID];
          }
        }

        for (const node of nodes) {
          const remote = {
            node: node,
            service: mrServiceName,
            method: 'map',
          };

          global.distribution.local.comm.send([nidsToKeys[id.getNID(node)], context.gid, configuration.map, console.log], remote, (e, v) => {

          });
        }
      });
    });
  }

  return {exec};
};

module.exports = mr;
