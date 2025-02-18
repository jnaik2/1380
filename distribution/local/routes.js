/** @typedef {import("../types").Callback} Callback */

let routesMap = {};

/**
 * @param {string | {service: string, gid: string}} configuration
 * @param {Callback} callback
 * @return {void}
 */
function get(configuration, callback) {
  let callBack = callback || console.log;
  if (!configuration) {
    callback(new Error("Configuration not specified"), null);
    return;
  }

  let gid;
  if (typeof configuration === "object") {
    gid = configuration.gid;
    configuration = configuration.service;
  }

  if (!gid) {
    gid = "local";
  }

  let map = routesMap;
  if (gid != "local") {
    map = global.distribution[gid];
  }

  if (!(configuration in map)) {
    const rpc = global.toLocal[configuration];
    if (rpc) {
      callback(null, { call: rpc });
    } else {
      callBack(new Error(`Service, ${configuration}, not accessible`), null);
    }
  } else {
    callBack(null, map[configuration]);
  }
}

/**
 * @param {object} service
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
function put(service, configuration, callback) {
  let callBack = callback || (() => {});
  if (!configuration) {
    callback(new Error("Configuration not specified"), null);
    return;
  }
  if (!service) {
    callback(new Error("Service not specified"), null);
    return;
  }
  routesMap[configuration] = service;
  callBack(null, configuration);
}

/**
 * @param {string} configuration
 * @param {Callback} callback
 */
function rem(configuration, callback) {
  let callBack = callback || console.log;
  if (!configuration) {
    callback(new Error("Configuration not specified"), null);
    return;
  }
  if (!routesMap[configuration]) {
    callBack(new Error("Value not accessible in service"), null);
  } else {
    delete routesMap[configuration];
    callBack(null, configuration);
  }
}

module.exports = { get, put, rem };
