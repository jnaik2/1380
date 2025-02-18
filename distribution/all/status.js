const id = distribution.util.id;
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
      global.distribution.local.status.spawn(configuration, (e1, v1) => {
        distribution.local.groups.add(
          context.gid,
          configuration,
          (_, group) => {
            global.distribution[context.gid].groups.put(
              context.gid,
              group,
              (e, v) => {
                // console.log(v);
                callBack(e1, v1);
              }
            );
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
