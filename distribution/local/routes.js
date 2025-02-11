/** @typedef {import("../types").Callback} Callback */

const routes = { get, put, rem };
let serviceMap = {};

/**
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
function get(configuration, callback) {
  let callBack = callback || console.log;
  if (!configuration) {
    callback(new Error("Configuration not specified"), null);
    return;
  }
  if (!serviceMap[configuration]) {
    callBack(new Error("Value not accessible in service"), null);
  } else {
    callBack(null, serviceMap[configuration]);
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
  serviceMap[configuration] = service;
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
  if (!serviceMap[configuration]) {
    callBack(new Error("Value not accessible in service"), null);
  } else {
    delete serviceMap[configuration];
    callBack(null, configuration);
  }
}

module.exports = routes;
