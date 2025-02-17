const groups = function (config) {
  const context = {};
  context.gid = config.gid || "all";

  return {
    put: (config, group, callback) => {
      let callBack = callback || console.log;
      let remote = { service: "groups", method: "put" };

      distribution[context.gid].comm.send(
        [config, group],
        remote,
        (errorMap, responseMap) => {
          if (errorMap) {
            callBack(errorMap, null);
          } else {
            callBack(null, responseMap);
          }
        }
      );
    },

    del: (name, callback) => {
      let callBack = callback || console.log;
      let remote = { service: "groups", method: "del" };

      distribution[context.gid].comm.send(
        name,
        remote,
        (errorMap, responseMap) => {
          if (errorMap) {
            callBack(errorMap, null);
          } else {
            callBack(null, responseMap);
          }
        }
      );
    },

    get: (name, callback) => {
      let callBack = callback || console.log;
      let remote = { service: "groups", method: "get" };

      distribution[context.gid].comm.send(
        name,
        remote,
        (errorMap, responseMap) => {
          if (errorMap) {
            callBack(errorMap, null);
          } else {
            callBack(null, responseMap);
          }
        }
      );
    },

    add: (name, node, callback) => {
      let callBack = callback || console.log;
      let remote = { service: "groups", method: "add" };

      distribution[context.gid].comm.send(
        [name, node],
        remote,
        (errorMap, responseMap) => {
          if (errorMap) {
            callBack(errorMap, null);
          } else {
            callBack(null, responseMap);
          }
        }
      );
    },

    rem: (name, node, callback) => {
      let callBack = callback || console.log;
      let remote = { service: "groups", method: "rem" };

      distribution[context.gid].comm.send(
        [name, node],
        remote,
        (errorMap, responseMap) => {
          if (errorMap) {
            callBack(errorMap, null);
          } else {
            callBack(null, responseMap);
          }
        }
      );
    },
  };
};

module.exports = groups;
