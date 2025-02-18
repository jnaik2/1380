const distribution = require("../../distribution");
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
  global.distribution[gid].status = require("../../distribution/all/status")({
    gid: "all",
  });
  global.distribution[gid].comm = require("../../distribution/all/comm")({
    gid: "all",
  });
  global.distribution[gid].gossip = require("../../distribution/all/gossip")({
    gid: "all",
  });
  global.distribution[gid].groups = require("../../distribution/all/groups")({
    gid: "all",
  });
  global.distribution[gid].routes = require("../../distribution/all/routes")({
    gid: "all",
  });
  global.distribution[gid].mem = require("../../distribution/all/mem")({
    gid: "all",
  });
  global.distribution[gid].store = require("../../distribution/all/store")({
    gid: "all",
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
