const groups = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  return {
    put: (config, group, callback) => {
      const callBack = callback || console.log;
      const remote = {service: 'groups', method: 'put'};

      global.distribution[context.gid].comm.send(
          [config, group],
          remote,
          (errorMap, responseMap) => {
            callBack(errorMap, responseMap);
          },
      );
    },

    del: (name, callback) => {
      const callBack = callback || console.log;
      const remote = {service: 'groups', method: 'del'};

      global.distribution[context.gid].comm.send(
          [name],
          remote,
          (errorMap, responseMap) => {
            callBack(errorMap, responseMap);
          },
      );
    },

    get: (name, callback) => {
      const callBack = callback || console.log;
      const remote = {service: 'groups', method: 'get'};

      global.distribution[context.gid].comm.send(
          [name],
          remote,
          (errorMap, responseMap) => {
            callBack(errorMap, responseMap);
          },
      );
    },

    add: (name, node, callback) => {
      const callBack = callback || console.log;
      const remote = {service: 'groups', method: 'add'};

      global.distribution[context.gid].comm.send(
          [name, node],
          remote,
          (errorMap, responseMap) => {
            callBack(errorMap, responseMap);
          },
      );
    },

    rem: (name, node, callback) => {
      const callBack = callback || console.log;
      const remote = {service: 'groups', method: 'rem'};

      global.distribution[context.gid].comm.send(
          [name, node],
          remote,
          (errorMap, responseMap) => {
            callBack(errorMap, responseMap);
          },
      );
    },
  };
};

module.exports = groups;
