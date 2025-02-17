const distribution = require("../../distribution");

const status = function (config) {
  const context = {};
  context.gid = config.gid || "all";

  return {
    get: (configuration, callback) => {
      let callBack = callback || console.log;
      let remote = { service: "status", method: "get" };

      distribution[context.gid].comm.send(
        configuration,
        remote,
        (errorMap, responseMap) => {
          if (errorMap) {
            callBack(errorMap, null);
          } else {
            let sum = 0;
            for (const sid in responseMap) {
              sum += responseMap[sid];
            }
            callBack(null, sum);
          }
        }
      );
    },

    spawn: (configuration, callback) => {},

    stop: (callback) => {},
  };
};

module.exports = status;
