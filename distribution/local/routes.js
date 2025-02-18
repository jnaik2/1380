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

  let gid = "local";
  let status = configuration;
  if (typeof configuration === "object") {
    configuration = configuration.service;
    status = configuration.status;
  }

  let service;
  if (gid == "local") {
    service = routesMap[configuration];
  } else {
    service = distribution[gid][configuration];
  }

  if (!service) {
    const rpc = global.toLocal[service];
    if (rpc) {
      callback(null, { call: rpc });
    } else {
      callBack(new Error(`Service, ${service}, not accessible`), null);
    }
  } else {
    callBack(null, service);
  }
}

/**
 * @param {object} service
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
function put(service, configuration, callback) {
  let callBack = callback || console.log;
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
