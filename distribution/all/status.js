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

    spawn: (configuration, callback) => {
      let callBack = callback || console.log;
      distribution.local.status.spawn(configuration, (e, v) => {
        distribution[context.gid].comm.send(
          [context.gid, configuration],
          {
            service: "groups",
            method: "add",
          },
          (_, __) => {
            if (e) {
              callBack(e, null);
            } else {
              callBack(null, v);
            }
          }
        );
      });
    },

    stop: (callback) => {
      let callBack = callback || console.log;
      let remote = { service: "status", method: "stop" };

      distribution[context.gid].comm.send(
        [],
        remote,
        (errorMap, responseMap) => {
          distribution.local.status.stop((e, v) => {
            if (errorMap) {
              callBack(errorMap, null);
            } else {
              callBack(null, responseMap);
            }
          });
        }
      );
    },
  };
};

module.exports = status;
