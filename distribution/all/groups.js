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
          callBack(errorMap, responseMap);
        }
      );
    },

    del: (name, callback) => {
      let callBack = callback || console.log;
      let remote = { service: "groups", method: "del" };

      distribution[context.gid].comm.send(
        [name],
        remote,
        (errorMap, responseMap) => {
          callBack(errorMap, responseMap);
        }
      );
    },

    get: (name, callback) => {
      let callBack = callback || console.log;
      let remote = { service: "groups", method: "get" };

      distribution[context.gid].comm.send(
        [name],
        remote,
        (errorMap, responseMap) => {
          callBack(errorMap, responseMap);
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
          callBack(errorMap, responseMap);
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
          callBack(errorMap, responseMap);
        }
      );
    },
  };
};

module.exports = groups;
