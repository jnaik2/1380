const id = require("../util/id");

const groups = {};

let nodeMap = {};

/**
 * @param {string} name
 * @param {Callback} callback
 * @return {void}
 */
groups.get = function (name, callback) {
  let callBack = callback || console.log;

  if (!name) {
    callBack(new Error("Group name is required argument"), null);
    return;
  }

  if (nodeMap[name]) {
    callBack(null, nodeMap[name]);
  } else {
    callBack(new Error("Group not found"), null);
  }
};

groups.put = function (config, group, callback) {
  let callBack = callback || console.log;

  if (!config) {
    callBack(new Error("Group name is required argument"), null);
    return;
  }

  let gid = config;
  if (typeof config === "object") {
    gid = config.gid;
  }

  global.distribution[gid] = {};
  global.distribution[gid].status = require("../all/status")({
    gid: gid,
  });
  global.distribution[gid].comm = require("../all/comm")({
    gid: gid,
  });
  global.distribution[gid].gossip = require("../all/gossip")({
    gid: gid,
  });
  global.distribution[gid].groups = require("../all/groups")({
    gid: gid,
  });
  global.distribution[gid].routes = require("../all/routes")({
    gid: gid,
  });
  global.distribution[gid].mem = require("../all/mem")({
    gid: gid,
  });
  global.distribution[gid].store = require("../all/store")({
    gid: gid,
  });

  if (!nodeMap["all"]) {
    nodeMap["all"] = {};
  } else {
    Object.assign(nodeMap["all"], group);
  }

  nodeMap[gid] = group;

  callBack(null, group);
};

groups.del = function (name, callback) {
  let callBack = callback || console.log;

  if (!name) {
    callBack(new Error("Group name is required argument"), null);
    return;
  }

  if (nodeMap[name]) {
    let group = nodeMap[name];
    delete nodeMap[name];
    callBack(null, group);
  } else {
    callBack(new Error("Group not found"), null);
  }
};

groups.add = function (name, node, callback) {
  let callBack = callback || console.log;

  if (!name) {
    callBack(new Error("Group name is required argument"), null);
    return;
  } else if (!node) {
    callBack(new Error("Node is required argument"), null);
    return;
  }

  let sid = id.getSID(node);

  if (nodeMap[name]) {
    nodeMap[name][sid] = node;
  }
  callBack(null, nodeMap[name]);
};

groups.rem = function (name, node, callback) {
  let callBack = callback || console.log;

  if (!name) {
    callBack(new Error("Group name is required argument"), null);
    return;
  } else if (!node) {
    callBack(new Error("Node SID is required argument"), null);
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
