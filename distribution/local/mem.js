const {id} = require("../util/util");
let data = new Map();

function put(state, configuration, callback) {
    let key = configuration;

    if (!configuration) {
        key = id.getID(state);
    }

    data.set(key, state);
    callback(null, state);
};

function get(configuration, callback) {
    let value = data.get(configuration);

    if (value) {
        callback(null, value);
    } else {
        callback(new Error("No value found for key: " + configuration), null);
    }
}

function del(configuration, callback) {
    let value = data.get(configuration);

    if (value) {
        data.delete(configuration);
        callback(null, value);
    } else {
        callback(new Error("No value found for key: " + configuration), null);
    }
};

module.exports = {put, get, del};
