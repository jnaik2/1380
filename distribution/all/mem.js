const { id } = require('../util/util');

function mem(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  /* For the distributed mem service, the configuration will
          always be a string */
  return {
    get: (configuration, callback) => {
      let kid = id.getID(configuration);
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        let nids = [];
        Object.values(group).forEach(node => {
          nids.push(id.getNID(node));
        });

        let nid = context.hash(kid, nids);
        for (const node of Object.values(group)) {
          if (id.getNID(node) === nid) {
            global.distribution.local.comm.send([{key: configuration, gid: context.gid}], { node: node, service: "mem", method: "get" }, (err, res) => {
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

        let nids = [];
        Object.values(group).forEach(node => {
          nids.push(id.getNID(node));
        });

        let nid = context.hash(kid, nids);
        for (const node of Object.values(group)) {
          if (id.getNID(node) === nid) {
            global.distribution.local.comm.send([state, {key: key, gid: context.gid}], { node: node, service: "mem", method: "put"}, (err, res) => {
              callback(err, res);
            });
          }
        }
      });
    },

    del: (configuration, callback) => {
      let kid = id.getID(configuration);
      global.distribution.local.groups.get(context.gid, (err, group) => {
        if (err) {
          callback(err, null);
          return;
        }

        let nids = [];
        Object.values(group).forEach(node => {
          nids.push(id.getNID(node));
        });

        let nid = context.hash(kid, nids);
        for (const node of Object.values(group)) {
          if (id.getNID(node) === nid) {
            global.distribution.local.comm.send([{key: configuration, gid: context.gid}], { node: node, service: "mem", method: "del" }, (err, res) => {
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

module.exports = mem;
