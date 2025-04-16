/** @typedef {import("../types").Callback} Callback */

const id = require("../util/id");

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
    gid: config.gid || "all",
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
      const results = [];
      if (keys.length === 0) {
        callback(null, []);
        return;
      }

      // Keep track of pending operations
      let pendingOperations = keys.length;

      for (const key of keys) {
        global.distribution.local.store.get(
          { key: key, gid: gid },
          async (e, value) => {
            try {
              const result = mapFunc(key, value, (err, mapResult) => {
                if (err) {
                  // console.error("Mapper error:", err);
                } else if (Array.isArray(mapResult)) {
                  results.push(...mapResult);
                } else {
                  results.push(mapResult);
                }
                pendingOperations--;
                checkCompletion();
              });
            } catch (error) {
              console.error("Error in mapper:", error);
              pendingOperations--;
              checkCompletion();
            }
          }
        );
      }

      function checkCompletion() {
        if (pendingOperations === 0) {
          global.distribution.local.store.put(
            results,
            { key: `mr-map-${jobID}`, gid: gid },
            (e, v) => {
              callback(null, results);
            }
          );
        }
      }
    };

    // Shuffle
    mrServiceObject.shuffle = (gid, jobID, callback) => {
      // Retrieve map results
      global.distribution.local.store.get(
        { key: `mr-map-${jobID}`, gid: gid },
        (e, values) => {
          if (e) {
            callback(e, null);
            return;
          }
          const collection = {};
          values.forEach((innerValue) => {
            innerValue.forEach((value) => {
              const key = Object.keys(value)[0];
              if (!collection[key]) {
                collection[key] = [];
              }
              collection[key].push(value[key]);
            });
          });
          let count = 0;
          for (const key in collection) {
            // console.log(key);
            global.distribution[gid].store.put(
              collection[key],
              { key: `mr-shuffle-${key}`, append: "true" },
              (e, v) => {
                count++;
                if (count === Object.keys(collection).length) {
                  global.distribution.local.store.del(
                    { key: `mr-map-${jobID}`, gid: gid },
                    (e, v) => {
                      callback(null, Object.keys(collection).length);
                    }
                  );
                }
              }
            );
          }
        }
      );
    };

    // Reduce
    mrServiceObject.reduce = (gid, reduceFunc, callback) => {
      global.distribution.local.status.get("sid", (e, v) => {
        const localSid = v;
        global.distribution.local.store.get(
          { key: null, gid: gid },
          (e, keys) => {
            let count = 0;
            const results = [];
            const reduceKeys = [];
            for (const key of keys) {
              if (`${key}`.startsWith("mr-shuffle-")) {
                reduceKeys.push(key);
              }
            }
            if (reduceKeys.length === 0) {
              callback(null, null);
              return;
            }
            for (const key of reduceKeys) {
              // call local.mem.get for key (need to check whehter value is null or not)
              const currName = key.slice(11);
              // console.log("Current key is: ", key.slice(11));
              global.distribution.local.mem.get(key, (e, v) => {
                if (currName === "Pulp Fiction") {
                  console.log("seen");
                  console.log(JSON.stringify(v));
                }
                let seen;
                if (v !== null) {
                  seen = new Set(v);
                } else {
                  seen = new Set();
                }
                global.distribution.local.store.get(
                  { key: key, gid: gid },
                  (e, value) => {
                    const result = reduceFunc(key.slice(11), value);
                    if (!seen.has(JSON.stringify(result))) {
                      results.push(result);
                      seen.add(JSON.stringify(result));
                    }

                    // call local.mem.put again
                    // if (currName === "Pulp Fiction") {
                    //   console.log("new seen");
                    //   console.log(JSON.stringify(seen));
                    //   console.log(JSON.stringify(results));
                    // }
                    global.distribution.local.mem.put(seen, key, (e, v) => {
                      if (e) {
                        console.error(
                          `Error in mem putting with object: ${seen} and key: ${key}`
                        );
                      }
                      global.distribution.local.store.del(
                        { key: key, gid: gid },
                        (e, v) => {
                          count++;
                          // this is step 4
                          if (count === reduceKeys.length) {
                            global.distribution.local.store.put(
                              results,
                              {
                                key: `local-index-${localSid}`,
                                gid: "local",
                                append: "true",
                              },
                              (e, v) => {
                                callback(null, results);
                                return;
                              }
                            );
                          }
                        }
                      );
                    });
                  }
                );
              });
            }
          }
        );
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
    console.log("Creating service: ");
    global.distribution[context.gid].routes.put(
      mrServiceObject,
      mrServiceName,
      (e, v) => {
        global.distribution.local.groups.get(context.gid, (e, groups) => {
          let mapResponses = 0;
          const workerCount = Object.keys(groups).length;
          const partition = partitionKeys(configuration.keys, groups);
          for (const sid in groups) {
            const nid = id.getNID(groups[sid]);
            const mapArgs = [
              partition[nid],
              configuration.map,
              context.gid,
              jobID,
            ];
            const mapRemote = {
              service: mrServiceName,
              method: "map",
              node: groups[sid],
            };
            let t1 = performance.now();
            global.distribution.local.comm.send(mapArgs, mapRemote, (e, v) => {
              if (e) {
                console.error(e);
              }
              mapResponses++;
              if (mapResponses == workerCount) {
                let t2 = performance.now();
                console.log("Calculating performance");
                console.log("keys length: ", configuration.keys.length);
                let latency = (t2 - t1) / configuration.keys.length;
                let throughput = (configuration.keys.length * 1000) / (t2 - t1);
                let results = {
                  throughput: throughput,
                  latency: latency,
                  time: (t2 - t1) / 1000,
                };
                global.distribution.local.store.put(
                  [results],
                  {
                    key: `performance-mapper-results`,
                    gid: "local",
                    append: "true",
                  },
                  (e, v) => {
                    // Start shuffle phase
                    console.log("Stored performance results: ", v);
                    const shuffleArgs = [context.gid, jobID];
                    const shuffleRemote = {
                      service: mrServiceName,
                      method: "shuffle",
                    };

                    t1 = performance.now();
                    global.distribution[context.gid].comm.send(
                      shuffleArgs,
                      shuffleRemote,
                      (e, v) => {
                        const keyLength = Object.values(v).reduce(
                          (sum, value) => sum + value,
                          0
                        );
                        // Start reduce phase
                        const reduceArgs = [context.gid, configuration.reduce];
                        const reduceRemote = {
                          service: mrServiceName,
                          method: "reduce",
                        };
                        global.distribution[context.gid].comm.send(
                          reduceArgs,
                          reduceRemote,
                          (e, v) => {
                            let reduceResults = [];
                            for (const value of Object.values(v)) {
                              if (value !== null) {
                                reduceResults = reduceResults.concat(value);
                              }
                            }

                            t2 = performance.now();
                            let latency = (t2 - t1) / keyLength;
                            let throughput = (keyLength * 1000) / (t2 - t1);
                            results = {
                              throughput: throughput,
                              latency: latency,
                              time: (t2 - t1) / 1000,
                            };
                            console.log("Calculating indexer performance");
                            console.log("keys length: " + keyLength);

                            global.distribution.local.store.put(
                              [results],
                              {
                                key: `performance-indexer-results`,
                                gid: "local",
                                append: "true",
                              },
                              (e, v2) => {
                                console.log("Stored performance results: ", v2);
                                global.distribution[context.gid].routes.rem(
                                  mrServiceName,
                                  (e, _) => {
                                    console.log("Removed service");
                                    cb(null, reduceResults);
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            });
          }
        });
      }
    );
  }

  return { exec };
}

module.exports = mr;
