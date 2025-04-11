/** @typedef {import("../types").Callback} Callback */

const id = require('../util/id');

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

  Orchestrator destroys services/endpoints on remote nodes upon completion of reduce (before running callback)
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
    const jobID = id.getID(configuration).substring(0, 5);
    const mrServiceObject = {};

    // Map
    mrServiceObject.map = (keys, mapFunc, gid, jobID, callback) => {
      // const deps = {
      //   html: require('html'),
      //   JSDOM: require('JSDOM'),
      //   url: require('URL'),
      // };
      const results = [];
      let count = 0;
      if (keys.length === 0) {
        callback(null, []);
        return;
      }
      for (const key of keys) {
        global.distribution.local.store.get({key: key, gid: gid}, (e, value) => {
          count++;
          console.log(mapFunc);
          console.log(typeof(mapFunc));
          const result = mapFunc(key, value);
          if (Array.isArray(result)) {
            results.push(...result);
          } else {
            results.push(result);
          }

          // Once all keys are processed, locally store results for shuffle
          if (count === keys.length) {
            global.distribution.local.store.put(results, {key: `mr-map-${jobID}`, gid: gid}, (e, v) => {
              callback(null, results);
            });
          }
        });
      }
    };

    // Shuffle
    mrServiceObject.shuffle = (gid, jobID, callback) => {
      // Retrieve map results
      global.distribution.local.store.get({key: `mr-map-${jobID}`, gid: gid}, (e, values) => {
        if (e) {
          callback(e, null);
          return;
        }
        // Collect all values that have the same key
        const collection = {};

        values.forEach((value) => {
          const key = Object.keys(value)[0];
          if (!collection[key]) {
            collection[key] = [];
          }
          collection[key].push(value[key]);
        });

        // Store the collection in the distributed store
        let count = 0;
        for (const key in collection) {
          global.distribution[gid].store.put(collection[key], {key: `mr-shuffle-${key}`, append: 'true'}, (e, v) => {
            count++;
            if (count === Object.keys(collection).length) {
              global.distribution.local.store.del({key: `mr-map-${jobID}`, gid: gid}, (e, v) => {
                callback(null, collection);
              });
            }
          });
        }
      });
    };

    // Reduce
    mrServiceObject.reduce = (gid, reduceFunc, callback) => {
      global.distribution.local.store.get({key: null, gid: gid}, (_, keys) => {
        let count = 0;
        const results = [];
        const reduceKeys = [];
        for (const key of keys) {
          if (`${key}`.startsWith('mr-shuffle-')) {
            reduceKeys.push(key);
          }
        }
        if (reduceKeys.length === 0) {
          callback(null, null);
          return;
        }
        for (const key of reduceKeys) {
          global.distribution.local.store.get({key: key, gid: gid}, (e, value) => {
            count++;
            const result = reduceFunc(key.slice(11), value);
            if (Array.isArray(result)) {
              results.push(...result);
            } else {
              results.push(result);
            }

            global.distribution.local.store.del({key: key, gid: gid}, (e, v) => {
              if (count === reduceKeys.length) {
                callback(null, results);
                return;
              }
            });
          });
        }
      });
    };

    // Partition Keys
    const partitionKeys = (objectKeys, nodes) => {
      const results = {};
      Object.values(nodes).forEach((node) => {
        results[id.getNID(node)] = [];
      });

      objectKeys.forEach((key) => {
        const kid = id.getID(key);
        const nodeId = id.consistentHash(kid, Object.keys(results));
        results[nodeId].push(key);
      });
      // Results maps from NID to keys that should be handled at that node
      return results;
    };

    // Invocation
    const mrServiceName = `mr-${jobID}`;
    global.distribution[context.gid].routes.put(mrServiceObject, mrServiceName, (e, v) => {
      global.distribution.local.groups.get(context.gid, (e, groups) => {
        let mapResponses = 0;
        const workerCount = Object.keys(groups).length;
        const partition = partitionKeys(configuration.keys, groups);
        for (const sid in groups) {
          const nid = id.getNID(groups[sid]);
          const mapArgs = [partition[nid], configuration.map, context.gid, jobID];
          const mapRemote = {
            service: mrServiceName,
            method: 'map',
            node: groups[sid],
          };
          global.distribution.local.comm.send(mapArgs, mapRemote, (e, v) => {
            if (e) {
              console.error(e);
            }
            mapResponses++;
            if (mapResponses == workerCount) {
              // Start shuffle phase
              const shuffleArgs = [context.gid, jobID];
              const shuffleRemote = {
                service: mrServiceName,
                method: 'shuffle',
              };
              global.distribution[context.gid].comm.send(shuffleArgs, shuffleRemote, (e, v) => {
                // Start reduce phase
                const reduceArgs = [context.gid, configuration.reduce];
                const reduceRemote = {
                  service: mrServiceName,
                  method: 'reduce',
                };
                global.distribution[context.gid].comm.send(reduceArgs, reduceRemote, (e, v) => {
                  // Collect results from all nodes
                  let reduceResults = [];
                  for (const value of Object.values(v)) {
                    if (value !== null) {
                      reduceResults = reduceResults.concat(value);
                    }
                  }
                  // Remove endpoint
                  global.distribution[context.gid].routes.rem(mrServiceName, (e, _) => {
                    cb(null, reduceResults);
                  });
                });
              });
            }
          });
        }
      });
    });
  }

  return {exec};
};

module.exports = mr;
