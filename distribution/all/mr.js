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

      // Track pending operations
      let pendingOperations = keys.length;
      console.log(
        `[MAP] Starting map phase for job ${jobID} with ${pendingOperations} keys`
      );

      // Process all keys with our improved concurrency control
      keys.forEach((key) => {
        global.distribution.local.store.get(
          { key: key, gid: gid },
          (err, value) => {
            if (err) {
              console.error(
                `[MAP] Error retrieving value for key ${key}:`,
                err
              );
              pendingOperations--;
              checkCompletion();
              return;
            }

            try {
              // Execute the mapper function
              mapFunc(key, value, (mapErr, mapResult) => {
                if (mapErr) {
                  console.error(`[MAP] Mapper error for key ${key}:`, mapErr);
                } else {
                  if (Array.isArray(mapResult)) {
                    results.push(...mapResult);
                  } else if (mapResult) {
                    results.push(mapResult);
                  }
                }

                pendingOperations--;
                console.log(
                  `[MAP] Completed mapping for key: ${key}, ${pendingOperations} operations remaining`
                );
                checkCompletion();
              });
            } catch (error) {
              console.error(`[MAP] Exception in mapper for key ${key}:`, error);
              pendingOperations--;
              checkCompletion();
            }
          }
        );
      });

      function checkCompletion() {
        if (pendingOperations === 0) {
          console.log(
            `[MAP] Map phase complete for job ${jobID}, collected ${results.length} results`
          );
          global.distribution.local.store.put(
            results,
            { key: `mr-map-${jobID}`, gid: gid },
            (e, v) => {
              if (e) {
                console.error(`[MAP] Error storing map results:`, e);
              }
              callback(null, results);
            }
          );
        }
      }
    };

    // Shuffle
    mrServiceObject.shuffle = (gid, jobID, callback) => {
      // console.log("IN SHUFFLE");
      // Retrieve map results
      global.distribution.local.store.get(
        { key: `mr-map-${jobID}`, gid: gid },
        (e, values) => {
          if (e) {
            callback(e, null);
            return;
          }
          // console.log(`IN SHUFFLE, results are ${JSON.stringify(values)}`);
          // console.log(`IN SHUFFLE, results length is: ${values.length}`);
          // Collect all values that have the same key
          const collection = {};
          // console.log("VALUES IN SHUFFLE IS: ", JSON.stringify(values));
          // values = values[0];
          // console.log(
          //   `IN SHUFFLE, results are ${JSON.stringify(
          //     values
          //   )} and its size is ${values.length}`
          // );
          // for (const [k, v] in Object.entries(values)) {
          //   console.log(`IN SHUFFLE, results key is ${k} and value is ${v}`);
          //   console.log("\n");
          // }
          if (values.length !== 0) {
            try {
              // console.log("Actual value");
              // console.log(values);
              values.forEach((innerValue) => {
                // console.log("Inner value");
                // console.log(innerValue);
                if (innerValue.length !== 0) {
                  innerValue.forEach((value) => {
                    // console.log("Value in values loop: ", values);
                    const key = Object.keys(value)[0];
                    // console.log("key", key);
                    if (!collection[key]) {
                      collection[key] = [];
                    }
                    collection[key].push(value[key]);
                    // console.log(
                    //   "After adding key, we get: ",
                    //   JSON.stringify(collection)
                    // );
                  });
                }
              });
            } catch (error) {
              // console.log("Actual value");
              // console.log(values);
              console.error(
                `Error in looping through values ${JSON.stringify(
                  values
                )} with error ${error}`
              );
            }
          }

          // console.log("IN SHUFFLE COLLECTION");
          // console.log(collection);
          // Store the collection in the distributed store
          let count = 0;
          for (const key in collection) {
            // console.log("Trying to store key: ", key);
            const lastIndex = key.lastIndexOf("/");
            const tConst = key.substring(lastIndex + 1);
            // console.log(tConst);
            global.distribution[gid].store.put(
              collection[key],
              { key: `mr-shuffle-${tConst}`, append: "true" },
              (e, v) => {
                // console.log("IN STORE");
                // console.log(e);
                count++;
                if (count === Object.keys(collection).length) {
                  global.distribution.local.store.del(
                    { key: `mr-map-${jobID}`, gid: gid },
                    (e, v) => {
                      callback(null, collection);
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
            // if (e) {
            //   console.log("Error in store get for reduce: ", e);
            // }
            // console.log("IN REDUCE PART OF MR");
            // console.log("keys is: ", keys);
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
              global.distribution.local.store.get(
                { key: key, gid: gid },
                (e, value) => {
                  count++;
                  const result = reduceFunc(key.slice(11), value);
                  if (Array.isArray(result)) {
                    results.push(...result);
                  } else {
                    results.push(result);
                  }

                  global.distribution.local.store.del(
                    { key: key, gid: gid },
                    (e, v) => {
                      // if (count === reduceKeys.length) {
                      //   callback(null, results);
                      //   return;
                      // }
                      global.distribution.local.store.put(
                        results,
                        {
                          key: `local-index-${localSid}`,
                          gid: "local",
                          append: "true",
                        },
                        (e, v) => {
                          if (count === reduceKeys.length) {
                            callback(null, results);
                            return;
                          }
                        }
                      );
                    }
                  );
                }
              );
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
                  method: "shuffle",
                };
                global.distribution[context.gid].comm.send(
                  shuffleArgs,
                  shuffleRemote,
                  (e, v) => {
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
                        // Collect results from all nodes
                        let reduceResults = [];
                        for (const value of Object.values(v)) {
                          if (value !== null) {
                            reduceResults = reduceResults.concat(value);
                          }
                        }
                        // Remove endpoint
                        global.distribution[context.gid].routes.rem(
                          mrServiceName,
                          (e, _) => {
                            cb(null, reduceResults);
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
