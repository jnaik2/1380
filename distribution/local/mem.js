const {id} = require("../util/util");
let data = new Map();

function put(state, configuration, callback) {

    let key;
    let gid = "local";

    if (typeof configuration === "string") {
        key = configuration;
    } else if (configuration != null) {
        key = configuration.key;
        gid = configuration.gid;
    }

    if (!key) {
        key = id.getID(state);
    }

    if (!(data.has(gid))) {
        data.set(gid, new Map());
    }
    data.get(gid).set(key, state);
    callback(null, state);
};

function get(configuration, callback) {
    let key;
    let gid = "local";

    if (typeof configuration === "string") {
        key = configuration;
    } else {
        key = configuration.key;
        gid = configuration.gid;
    }

    let value = data.get(gid);
    if (!value) {
        callback(new Error("No value found for key " + key + " in GID:" + gid), null);
        return;
    }
    value = value.get(key);

    if (value) {
        callback(null, value);
    } else {
        callback(new Error("No value found for key " + key + " in GID:" + gid), null);
    }
}

function del(configuration, callback) {
    let key;
    let gid = "local";

    if (typeof configuration === "string") {
        key = configuration;
    } else {
        key = configuration.key;
        gid = configuration.gid;
    }

    let value = data.get(gid);
    if (!value) {
        callback(new Error("No value found for key " + key + " in GID:" + gid), null);
        return;
    }
    value = value.get(key);

    if (value) {
        data.get(gid).delete(key);
        callback(null, value);
    } else {
        callback(new Error("No value found for key " + key + " in GID:" + gid), null);
    }
};

module.exports = {put, get, del};
