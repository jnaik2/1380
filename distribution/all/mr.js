/** @typedef {import("../types").Callback} Callback */

// const distribution = require('../../config');
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
    console.log('Starting MapReduce execution with configuration:', configuration);
    const configId = id.getID({timestamp: Date.now(), rand: Math.random()}); // use timestamp so that we are guaranteed to generate a new service. Add random seed so that in case clocks have same timstamp or weird clock errors, we can still get some randomness
    const serviceId = `mr-${configId}`;
    const workerServiceId = `worker-${serviceId}`;

    console.log('Generated service ID:', serviceId);

    // 1) Create mr service that will be instantiated on worker nodes
    //  2) Crete notify service that will be instantiated on orchestrator node (node runing mr.exec)
    //  3) Register services using routes.put and then start map

    global.distribution.local.status.get('sid', (e, v) => {
      if (e !== null && Object.keys(e).length > 0) {
        console.log('[Orchestrator] Failed to get my local sid: ', e);
        cb(e, {});
      }
      global.distribution.local.status.get('ip', (ipE, ipV) => {
        if (ipE !== null && Object.keys(ipE).length > 0) {
          console.log('[Orchestrator] Failed to get my local ip: ', ipE);
          cb(ipE, {});
        }
        global.distribution.local.status.get('port', (portE, portV) => {
          // need to get local sid to send notify to orchestrator node
          // use sid or nid?
          if (portE !== null && Object.keys(portE).length > 0) {
            console.log('[Orchestrator] Failed to get my local port: ', portE);
            cb(portE, {});
          }
          const workerService = {
            mapperFunc: configuration.map,
            reducerFunc: configuration.reduce,
            orchestratorSid: v,
            orchestratorNode: {
              sid: v,
              port: portV,
              ip: ipV,
            },
            serviceId: serviceId,
            mapFunc: function(keys, gid, jid, mapCallback) {
              mapCallback = mapCallback || {}();
              // get local nodes sid for logging purposes
              global.distribution.local.status.get('sid', (e, v) => {
                if (e !== null && Object.keys(e).length > 0) {
                  console.log('[Local node] Failed to get sid');
                  mapCallback(e, {});
                  return;
                }

                const localSid = v;
                console.log(`${localSid} node starting map procedure for ${keys.length} keys with job id ${jid}`);

                if (keys.length == 0) {
                  console.log(`${localSid} No keys`);
                  // mapCallback(null, {});
                  const notifyRemote = {
                    service: this.serviceId,
                    method: 'notify',
                    node: this.orchestratorNode,
                  };

                  const args = {
                    phase: 'map',
                    results: [],
                    nodeId: localSid,
                  };
                  global.distribution.local.comm.send(args, notifyRemote, (commE, commV) => { // this is definitely wrong. check how we are sneding messages to notify.
                    if (commE !== null && Object.keys(commE).length > 0) {
                      console.error(` ${localSid} Error recieved for sending notify to orchestrator: `, commE);
                    }
                    mapCallback(commE, commV);
                    return;
                  });
                };

                const mapResults = [];
                let keysCompleted = 0;

                keys.forEach((key) => {
                  console.log(`${localSid} Processing key: ${key}`);

                  // get store results for current key
                  global.distribution[gid].store.get(key, (storeErr, storeRes) => {
                    if (storeErr !== null && Object.keys(storeErr) > 0) {
                      console.log(`${localSid} Error getting store for key: ${key}, error: ${e}`);
                      mapCallback(storeErr, {});
                      return;
                    }
                    console.log(`${localSid} got store for key: ${key}, result: ${storeRes}`);

                    keysCompleted+=1;

                    let mapperResult;
                    try {
                      mapperResult = this.mapperFunc(key, storeRes);
                      console.log(`[${localSid}] Mapper result for key ${key} is ${JSON.stringify(mapperResult)}`);
                      if (Array.isArray(mapperResult)) {
                        mapResults.push(...mapperResult);
                      } else {
                        mapResults.push(mapperResult);
                      }
                    } catch (mapperError) {
                      console.error(`[${localSid}] Error in mapper function for key ${key}:`, mapperError);
                    }


                    // map function is done for this node. put in mem and send notify to orchestrator
                    if (keysCompleted === keys.length) {
                      console.log(`[${localSid}] Map done`);
                      console.log(`[${localSid}] Mapper results is ${JSON.stringify(mapperResult)}`);
                    }

                    global.distribution.local.store.put(mapResults, jid + '_mapResults' + localSid, (storePutErr, storePutRes) => {
                      if (storePutErr !== null && Object.keys(storePutErr) > 0) {
                        console.error(`${localSid} Error putting store for key: ${key}, error: ${e}`);
                        mapCallback(storePutErr, {});
                        return;
                      }

                      console.log(`${localSid} putting store for key: ${key}, result: ${JSON.stringify(storePutRes)}`);

                      const notifyRemote = {
                        service: this.serviceId,
                        method: 'notify',
                        node: this.orchestratorNode,
                      };

                      const args = {
                        phase: 'map',
                        results: mapResults,
                        nodeId: localSid,
                      };

                      console.log(`${localSid} Sending notify to orchestrator remote: ${JSON.stringify(notifyRemote)}`);
                      console.log(`${localSid} Sending notify to orchestrator: ${JSON.stringify(args)}`);

                      global.distribution.local.comm.send(args, notifyRemote, (commE, commV) => {
                        if (commE !== null && Object.keys(commE).length > 0) {
                          console.error(` ${localSid} Error recieved for sending notify to orchestrator: `, commE);
                        }
                        mapCallback(commE, commV);
                      });
                    });
                  });
                });
              });
            },
            reduceFunc: function(gid, jid, reduceCallback) {
              reduceCallback = reduceCallback || function() {};
              global.distribution.local.status.get('sid', (e, v) => {
                if (e !== null && Object.keys(e).length > 0) {
                  console.log('[Local node] Failed to get sid');
                  reduceCallback(e, {});
                  return;
                }

                const localSid = v;
                console.log(`${localSid} node starting reducer procedure with job id ${jid}`);
                const shuffleKey = jid + '_shuffleResults' + localSid;
                global.distribution.local.mem.get(shuffleKey, (getErr, getRes) => {
                  if (getErr !== null && Object.keys(getErr).length > 0) {
                    console.error(`[${localSid}] Error retrieving keys for reduce phase:`, getErr);
                    reduceCallback(getErr, getRes);
                  }

                  let reducerRes = [];

                  if (!getRes || getRes.length == 0) {
                    console.log(`[${localSid}] No keys to process in reduce phase`);
                    const notifyRequest = {
                      service: this.serviceId,
                      method: 'notify',
                      node: this.orchestratorNode,
                    };

                    const args = {phase: 'reduce', nodeId: localSid, results: null};
                    global.distribution.local.comm.send(
                        args,
                        notifyRequest,
                        (e1, v1) => {
                          reduceCallback(e1, v1);
                        },
                    );
                    return;
                  }

                  const keysReducer = Object.keys(getRes); // get keys for reducer mem get
                  console.log(`${localSid}: Reducer getting results from store are ${Object.values(getRes)} and the keys are ${keysReducer}\n`);
                  keysReducer.forEach((key) => {
                    console.log(`${localSid} starting reducer function on key ${key}`);
                    const res = getRes[key];
                    console.log(`${localSid} starting reducer function with value ${res}`)
                    try {
                      const reducerResult = this.reducerFunc(key, res);
                      reducerRes = reducerRes.concat(reducerResult);
                    } catch (reducerError) {
                      console.error(`${localSid}: Reducer error is ${reducerError}`);
                    }
                  });

                  console.log(`${localSid} Finished reducing and now sending to orchestrator`);
                  const notifyRequest = {
                    service: this.serviceId,
                    method: 'notify',
                    node: this.orchestratorNode,
                  };

                  const args = {phase: 'reduce', nodeId: localSid, results: reducerRes};
                  global.distribution.local.comm.send(
                      args,
                      notifyRequest,
                      (notifyErr, notifyRes) => {
                        if (notifyErr) {
                          console.error(`[${localSid}] Error notifying orchestrator about reduce completion:`, notifyErr);
                        } else {
                          console.log(`[${localSid}] Orchestrator notified of reduce completion:`, notifyRes);
                        }
                        reduceCallback(notifyErr, notifyRes);
                      },
                  );
                  return;
                });
              });
            },
            shuffleFunc: function(gid, jid, shuffleCallback) {
              shuffleCallback = shuffleCallback || function() {};
              global.distribution.local.status.get('sid', (e, v) => {
                if (e !== null && Object.keys(e).length > 0) {
                  console.log('[Local node] Failed to get sid');
                  shuffleCallback(e, {});
                  return;
                }

                const localSid = v;
                console.log(`${localSid} node starting shuffle procedure with job id ${jid}`);

                global.distribution.local.store.get(jid + '_mapResults' + localSid, (storeErr, storeRes) => {
                  if (storeErr !== null && Object.keys(storeErr).length > 0) {
                    console.error(`${localSid} failed to get store results for key ${jid + '_mapResults' + localSid}`);
                    shuffleCallback(storeErr, {});
                    return;
                  }
                  const res = [];
                  // const keysProcessed = 0;
                  if (!storeRes || storeRes.length === 0) {
                    console.log(`[${localSid}] No map results to shuffle`);
                    const notifyRemote = {
                      service: this.serviceId,
                      method: 'notify',
                      node: this.orchestratorNode,
                    };

                    const args = {phase: 'shuffle', nodeId: localSid, results: null};

                    global.distribution.local.comm.send(
                        args,
                        notifyRemote, (e, v) => {
                          if (e !== null && Object.keys(e).length > 0) {
                            console.error(`${localSid}: Error in sending notify: ${e}`);
                          }
                          shuffleCallback(e, v);
                        });
                    return;
                  }

                  // group by item
                  storeRes.forEach((key) => {
                    const [keys] = Object.keys(key);
                    console.log(`[${localSid}] Shuffling key ${keys}: ${key[keys]}`);

                    if (!res[keys]) {
                      res[keys] = [];
                    }
                    res[keys].push(key[keys]);
                  });

                  const shuffleKey = jid + '_shuffleResults' + localSid;
                  global.distribution.local.mem.put(res, shuffleKey, (memPuterr, memPutRes) => {
                    if (memPuterr) {
                      console.error(`[${localSid}] Error in shuffle putting data for key ${shuffleKey}:`, memPuterr);
                    } else {
                      console.log(`[${localSid}] Successfully shuffled data for key ${shuffleKey}:`, memPutRes);
                    }

                    console.log(`${localSid}: Done shuffling. Notifying orcehstrator`);
                    const notifyRemote = {
                      service: this.serviceId,
                      method: 'notify',
                      node: this.orchestratorNode,
                    };

                    const args = {phase: 'shuffle', nodeId: localSid, results: null};

                    global.distribution.local.comm.send(
                        args,
                        notifyRemote, (notifyErr, notifyRes) => {
                          if (notifyErr !== null && Object.keys(notifyErr).length > 0) {
                            console.error(`${localSid}: Error in sending notify: ${e}`);
                          }
                          shuffleCallback(notifyErr, notifyRes);
                        });
                    return;
                  });
                });
              });
            },
          };


          const orchestratorService = {
            completedMapPart: {},
            completedReducePart: {},
            completedShufflePart: {},
            reducerResults: {},
            totalNodes: 0,
            contextGid: context.gid,
            configId: configId,
            workerServiceId: workerServiceId,

            notify: function(notification, notifyCallback) {
              console.log(`[Orchestrator] Received notification: ${JSON.stringify(notification)}`);
              console.log(`[Orchestrator] Received ${notification.phase} phase completion notification from node ${notification.nodeId}`);

              // just got a map notify
              if (notification.phase === 'map') {
                // put this nid as true
              // use this map structure so that I can track which nodes were actually completed for better logging purposes
                this.completedMapPart[notification.nodeId] = true;
                console.log(`[Orchestrator] Map completion status:`, this.completedMapPart);

                // check if all map operations are complete
                if (Object.keys(this.completedMapPart).length === this.totalNodes) {
                  console.log('[Orchestrator] All map operations complete, starting shuffle phase');

                  // start shuffle phase on all nodes
                  const shuffleRequest = {
                    service: workerServiceId,
                    method: 'shuffleFunc',
                  };


                  // start shuffle phase

                  // for this, check whether we are sending correctly to comm.send
                  global.distribution[this.contextGid].comm.send(
                      [this.contextGid, this.workerServiceId],
                      shuffleRequest, // need to pass more arguments
                      (err, res) => {
                        if (err) {
                          console.error('[Orchestrator] Error starting shuffle phase:', err);
                        } else {
                          console.log('[Orchestrator] Shuffle phase started successfully:', res);
                        }
                      },
                  );
                } else {
                  console.log(`[Orchestrator] Waiting for ${this.totalNodes - Object.keys(this.completedMapPart).length} more nodes to complete map phase`);
                }
              } else if (notification.phase === 'shuffle') {
                this.completedShufflePart[notification.nodeId] = true;
                console.log(`[Orchestrator] Shuffle completion status:`, this.completedShufflePart);

                if (Object.keys(this.completedShufflePart).length == this.totalNodes) {
                  console.log('[Orchestrator] All shuffle operations complete, starting reducer phase');
                  // start shuffle phase on all nodes
                  const reduceRequest = {
                    service: workerServiceId,
                    method: 'reduceFunc',
                  };


                  // start shuffle phase

                  // for this, check whether we are sending correctly to comm.send
                  global.distribution[this.contextGid].comm.send(
                      [this.contextGid, this.workerServiceId],
                      reduceRequest,
                      (err, res) => {
                        if (err) {
                          console.error('[Orchestrator] Error starting reduce phase:', err);
                        } else {
                          console.log('[Orchestrator] Reduce phase started successfully:', res);
                        }
                      },
                  );
                } else {
                  console.log(`[Orchestrator] Waiting for ${this.totalNodes - Object.keys(this.completedShufflePart).length} more nodes to complete shuffle phase`);
                }
              } else if (notification.phase === 'reduce') {
                this.completedReducePart[notification.nodeId] = true;
                console.log(`[Orchestrator] Reduce completion status:`, this.completedReducePart);

                // store reduce results
                if (notification.results !== null) {
                  this.reducerResults[notification.nodeId] = notification.results;
                  console.log(`[Orchestrator] Received reduce results from node ${notification.nodeId}:`, notification.results);
                } else {
                  console.log(`[Orchestrator] Node ${notification.nodeId} reported no reduce results`);
                }

                // check if all reduce operations are complete
                if (Object.keys(this.completedReducePart).length === this.totalNodes) {
                  console.log('[Orchestrator] All reduce operations complete, finalizing results');

                  // Combine all reduce results
                  let finalResults = [];
                  for (const nodeId in this.reducerResults) {
                    const result = this.reducerResults[nodeId];
                    console.log(`[Orchestrator] Including results from node ${nodeId}:`, result);
                    if (result !== null) {
                      finalResults = finalResults.concat(result);
                    }
                  }

                  console.log('[Orchestrator] Combined final results:', finalResults);

                  let newId = `mr-${this.configId}`;
                  console.log('[Orchestrator] New Id is :', newId);
                  // delete service
                  console.log(`[Orchestrator] Deregistering MapReduce service with service ID ${newId} and workerService Id ${this.workerServiceId}`);
                  // global.distribution.local.routes.rem(`${newId}`, (remErr, remRes) => {
                  //   if (remErr !== null && Object.keys(remErr).length > 0) {
                  //     console.error('[Orchestrator] Error deregistering serviceId:', remErr);
                  //   } else {
                  //     console.log('[Orchestrator] ServiceId successfully deregistered:', remRes);
                  //   }
                  //   global.distribution[this.contextGid].routes.rem(this.workerServiceId, (err, res) => {
                  //     if (err !== null && Object.keys(err).length > 0) {
                  //       console.error('[Orchestrator] Error deregistering workerServiceId:', err);
                  //     } else {
                  //       console.log('[Orchestrator] workerServiceId successfully deregistered:', res);
                  //     }
  
                  //     // // return
                  //     // console.log(`[Orchestrator] Returning final results to caller: ${finalResults}`);
                  //     // cb(null, finalResults);
                  //   });
                    // return
                    console.log(`[Orchestrator] Returning final results to caller: ${JSON.stringify(finalResults)}`);
                    cb(null, finalResults);
                    return;
                  // });
                  // global.distribution[this.contextGid].routes.rem(this.workerServiceId, (err, res) => {
                  //   if (err) {
                  //     console.error('[Orchestrator] Error deregistering service:', err);
                  //   } else {
                  //     console.log('[Orchestrator] Service successfully deregistered:', res);
                  //   }

                  //   // return
                  //   console.log('[Orchestrator] Returning final results to caller');
                  //   cb(null, finalResults);
                  // });
                  // return
                  // console.log('[Orchestrator] Returning final results to caller');
                  // cb(null, finalResults);
                } else {
                  console.log(`[Orchestrator] Waiting for ${this.totalNodes - Object.keys(this.completedReducePart).length} more nodes to complete reduce phase`);
                }
              }
            },
          };

          // partition the keys
          const partitionKeys = function(keys, nodes) {
            console.log(`[Orchestrator] Partitioning ${keys.length} keys across ${Object.keys(nodes).length} nodes`);
            const partitioned = {};


            Object.keys(nodes).forEach((nodeId) => {
              partitioned[nodeId] = [];
            });

            const newNids = {};

            // we want to pass nids into consistent hashing
            for (const [k, v] of Object.entries(nodes)) {
              const nidnidnid = id.getNID(v);
              newNids[nidnidnid] = k;
            }

            // use consistent hashing
            keys.forEach((key) => {
              const keyId = global.distribution.util.id.getID(key);
              const nodeId = global.distribution.util.id.consistentHash(keyId, Object.keys(newNids)); // pass in nids so that consisten thashing actually works
              partitioned[newNids[nodeId]].push(key);
              console.log(`[Orchestrator] Assigned key ${key} (ID: ${keyId}) to node ${newNids[nodeId]}`);
            });

            console.log('[Orchestrator] Final key partitioning:', partitioned);
            return partitioned;
          };

          // register the services
          // register orchestrator services
          orchestratorService.workerServiceId = workerServiceId;
          orchestratorService.contextGid = context.gid;
          orchestratorService.configId = configId;
          global.distribution.local.routes.put(orchestratorService, serviceId, (routesErr, routesRes) => {
            if (routesErr !== null && Object.keys(routesErr).length > 0) {
              console.error('[Orchestrator] Error registering Orchestrator service:', routesErr);
              cb(routesErr, null);
              return;
            }

            console.log('[Orchestrator] Orchestrator service registered successfully:', routesRes);
            // register worker service on worker nodes
            console.log('[Orchestrator] Registering MapReduce worker service');

            global.distribution[context.gid].routes.put(workerService, workerServiceId, (workerErr, workerRes) => {
              if (workerErr !== null && Object.keys(workerErr).length > 0) {
                console.error('[Orchestrator] Error registering Orchestrator service:', workerErr);
                cb(workerErr, null);
                return;
              }
              console.log('[Orchestrator] Worker service registered successfully:', workerRes);

              // get all local group nodes
              console.log(`[Orchestrator] Getting nodes for group ${context.gid}`);

              global.distribution.local.groups.get(context.gid, (groupErr, nodes) => {
                if (groupErr) {
                  console.error('[Orchestrator] Error getting group nodes:', groupErr);
                  cb(groupErr, null);
                  return;
                }

                console.log(`[Orchestrator] Found ${Object.keys(nodes).length} nodes in group:`, nodes);
                console.log(`[Orchestrator] Reached the next line. OrchestratorServise `);
                console.log(` ${JSON.stringify(orchestratorService)}`);
                // store nodes
                orchestratorService.totalNodes = Object.keys(nodes).length;
                console.log(`[Orchestrator] Set total nodes to ${orchestratorService.totalNodes}`);

                // partition
                const partitionedKeys = partitionKeys(configuration.keys, nodes);

                // start map
                console.log('[Orchestrator] Starting map phase on all nodes');
                for (const sid in nodes) {
                  // key, gid, jid
                  const mapArgs = [partitionedKeys[sid], context.gid, workerServiceId];
                  console.log(`[Orchestrator] Map args are : ${JSON.stringify(mapArgs)}`);
                  console.log(`[Orchestrator] Starting map on node ${sid} with ${partitionedKeys[sid].length} keys`);
                  // map
                  const mapRemote = {
                    node: nodes[sid],
                    service: workerServiceId,
                    method: 'mapFunc',
                  };

                  console.log(`[Orchestrator] Map remote is: ${JSON.stringify(mapRemote)}`);

                  global.distribution.local.comm.send(
                      mapArgs,
                      mapRemote,
                      (mapErr, mapRes) => {
                        if (mapErr) {
                          console.error(`[Orchestrator] Error starting map on node ${sid}:`, mapErr);
                        } else {
                          console.log(`[Orchestrator] Map started successfully on node ${sid}:`, mapRes);
                        }
                      },
                  );
                }
              });
            });
          });
        });
      });
    });
  }

  return {exec};
};

module.exports = mr;
