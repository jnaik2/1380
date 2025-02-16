const id = require("../util/id");
const log = require("../util/log");

const status = {};

global.moreStatus = {
  sid: global.distribution.util.id.getSID(global.nodeConfig),
  nid: global.distribution.util.id.getNID(global.nodeConfig),
  counts: 0,
};

/**
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
status.get = function (configuration, callback) {
  let callBack = callback || console.log;
  if (!configuration) {
    callBack(new Error("Configuration not specified"), null);
    return;
  }

  switch (configuration) {
    case "sid":
    case "nid":
    case "counts":
      callBack(null, global.moreStatus[configuration]);
      break;
    case "ip":
    case "port":
      callBack(null, global.nodeConfig[configuration]);
      break;
    case "heapTotal":
    case "heapUsed":
      callBack(null, process.memoryUsage()[configuration]);
      break;
    default:
      callBack(new Error(`Inaccessible property: ${configuration}`), null);
      break;
  }
};

status.spawn = function (configuration, callback) {};

status.stop = function (callback) {};

module.exports = status;
