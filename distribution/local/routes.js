/** @typedef {import("../types").Callback} Callback */

const routesMap = {};

/**
 * @param {string | {service: string, gid: string}} configuration
 * @param {Callback} callback
 * @return {void}
 */
function get(configuration, callback) {
  const callBack = callback || console.log;
  if (!configuration) {
    callback(new Error('Configuration not specified'), null);
    return;
  }

  let gid;
  if (typeof configuration === 'object') {
    gid = configuration.gid;
    configuration = configuration.service;
  }

  if (!gid) {
    gid = 'local';
  }

  let map = routesMap;
  if (gid != 'local') {
    map = global.distribution[gid];
  }

  if (!(configuration in map)) {
    const rpc = global.toLocal[configuration];
    if (rpc) {
      callback(null, {call: rpc});
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
  const callBack = callback || (() => {});
  if (!configuration) {
    callback(new Error('Configuration not specified'), null);
    return;
  }
  if (!service) {
    callback(new Error('Service not specified'), null);
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
  const callBack = callback || console.log;
  if (!configuration) {
    callback(new Error('Configuration not specified'), null);
    return;
  }
  if (!routesMap[configuration]) {
    callBack(new Error('Value not accessible in service'), null);
  } else {
    if (!global.distribution[gid][thingToRemove]) {
      callback(new Error(`Value not accessible in global service: ${thingToRemove} from gid ${gid}`), null);
    } else {
      // console.log("SUCCESSFULLY REMOVED FOM")
      delete global.distribution[gid][thingToRemove];
      callback(null, thingToRemove);
    }
  }
}

module.exports = {get, put, rem};
