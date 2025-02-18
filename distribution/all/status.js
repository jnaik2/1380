const status = function (config) {
  const context = {};
  context.gid = config.gid || "all";

  return {
    get: (configuration, callback) => {
      let callBack = callback || console.log;
      let remote = { service: "status", method: "get" };

      global.distribution[context.gid].comm.send(
        [configuration],
        remote,
        (errorMap, responseMap) => {
          if (
            configuration == "heapTotal" ||
            configuration == "heapUsed" ||
            configuration == "counts"
          ) {
            let sum = 0;
            for (const sid in responseMap) {
              sum += responseMap[sid];
            }
            callBack(errorMap, sum);
          } else {
            callBack(errorMap, responseMap);
          }
        }
      );
    },

    spawn: (configuration, callback) => {
      let callBack = callback || console.log;
      global.distribution.local.status.spawn(configuration, (e, v) => {
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

      global.distribution[context.gid].comm.send(
        [],
        remote,
        (errorMap, responseMap) => {
          callBack(errorMap, responseMap);
        }
      );
    },
  };
};

module.exports = status;
