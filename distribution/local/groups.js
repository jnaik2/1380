const id = require('../util/id');

const groups = {};

const nodeMap = {};

/**
 * @param {string} name
 * @param {Callback} callback
 * @return {void}
 */
groups.get = function(name, callback) {
  const callBack = callback || console.log;

  if (!name) {
    callBack(new Error('Group name is required argument'), null);
    return;
  }

  if (nodeMap[name]) {
    callBack(null, nodeMap[name]);
  } else {
    callBack(new Error('Group not found'), null);
  }
};

groups.put = function(config, group, callback) {
  const callBack = callback || console.log;

  if (!config) {
    callBack(new Error('Group name is required argument'), null);
    return;
  }

  let gid = config;
  let hash;
  if (typeof config === 'object') {
    gid = config.gid;
    hash = config.hash || id.consistentHash;
  }

  global.distribution[gid] = {};
  global.distribution[gid].status = require('../all/status')({
    gid: gid, hash: hash,
  });
  global.distribution[gid].comm = require('../all/comm')({
    gid: gid, hash: hash,
  });
  global.distribution[gid].gossip = require('../all/gossip')({
    gid: gid, hash: hash,
  });
  global.distribution[gid].groups = require('../all/groups')({
    gid: gid, hash: hash,
  });
  global.distribution[gid].routes = require('../all/routes')({
    gid: gid, hash: hash,
  });
  global.distribution[gid].mem = require('../all/mem')({
    gid: gid, hash: hash,
  });
  global.distribution[gid].store = require('../all/store')({
    gid: gid, hash: hash,
  });
  global.distribution[gid].mr = require('../all/mr')({
    gid: gid, hash: hash,
  });


  if (!nodeMap['all']) {
    nodeMap['all'] = {};
  } else {
    Object.assign(nodeMap['all'], group);
  }

  nodeMap[gid] = group;

  callBack(null, group);
};

groups.del = function(name, callback) {
  const callBack = callback || console.log;

  if (!name) {
    callBack(new Error('Group name is required argument'), null);
    return;
  }

  if (nodeMap[name]) {
    const group = nodeMap[name];
    delete nodeMap[name];
    callBack(null, group);
  } else {
    callBack(new Error('Group not found'), null);
  }
};

groups.add = function(name, node, callback) {
  const callBack = callback || console.log;

  if (!name) {
    callBack(new Error('Group name is required argument'), null);
    return;
  } else if (!node) {
    callBack(new Error('Node is required argument'), null);
    return;
  }

  const sid = id.getSID(node);

  if (nodeMap[name]) {
    nodeMap[name][sid] = node;
  }
  callBack(null, nodeMap[name]);
};

groups.rem = function(name, node, callback) {
  const callBack = callback || console.log;

  if (!name) {
    callBack(new Error('Group name is required argument'), null);
    return;
  } else if (!node) {
    callBack(new Error('Node SID is required argument'), null);
    return;
  }

  let x;
  if (nodeMap[name]) {
    x = nodeMap[name][node];
    delete nodeMap[name][node];
  }
  callBack(null, x);
};

module.exports = groups;
