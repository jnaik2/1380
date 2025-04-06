const {id} = require('../util/util');

function store(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  /* For the distributed store service, the configuration will
          always be a string */
  return {
    get: (configuration, callback) => {
      const kid = id.getID(configuration);
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        const nids = [];
        Object.values(group).forEach((node) => {
          nids.push(id.getNID(node));
        });

        const nid = context.hash(kid, nids);
        for (const node of Object.values(group)) {
          if (id.getNID(node) === nid) {
            global.distribution.local.comm.send([{key: configuration, gid: context.gid}], {node: node, service: 'store', method: 'get'}, (err, res) => {
              callback(err, res);
            });
          }
        }
      });
    },

    put: (state, configuration, callback) => {
      let kid;
      let key;
      if (!configuration) {
        kid = id.getID((id.getID(state)));
        key = id.getID(state);
      } else {
        kid = id.getID(configuration);
        key = configuration;
      }

      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        const nids = [];
        Object.values(group).forEach((node) => {
          nids.push(id.getNID(node));
        });

        const nid = context.hash(kid, nids);
        for (const node of Object.values(group)) {
          if (id.getNID(node) === nid) {
            global.distribution.local.comm.send([state, {key: key, gid: context.gid}], {node: node, service: 'store', method: 'put'}, (err, res) => {
              callback(err, res);
            });
          }
        }
      });
    },

    del: (configuration, callback) => {
      const kid = id.getID(configuration);
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        const nids = [];
        Object.values(group).forEach((node) => {
          nids.push(id.getNID(node));
        });

        const nid = context.hash(kid, nids);
        for (const node of Object.values(group)) {
          if (id.getNID(node) === nid) {
            global.distribution.local.comm.send([{key: configuration, gid: context.gid}], {node: node, service: 'store', method: 'del'}, (err, res) => {
              callback(err, res);
            });
          }
        }
      });
    },

    reconf: (configuration, callback) => {
    },
  };
};

module.exports = store;
