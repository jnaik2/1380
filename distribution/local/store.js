/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/
const { id, serialize, deserialize } = require("../util/util");
const fs = require("fs");
const path = require("path");

function put(state, configuration, callback) {
  const nid = global.moreStatus["nid"];
  let key;
  let gid = "local";
  let append = false;
  if (typeof configuration === "string") {
    key = configuration;
  } else if (configuration != null) {
    key = configuration.key;
    gid = configuration.gid;
    if (configuration.append == "true") {
      append = true;
    }
  }

  if (!key) {
    key = id.getID(state);
  }

  const filepath = path.join(process.cwd(), `/store/${nid}/${gid}/${key}`);
  const dirPath = path.dirname(filepath);

  // console.log("IN STORE PUT, filepath is: ", filepath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  if (append) {
    try {
      if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, serialize(state));
        callback(null, state);
      } else {
        let data = fs.readFileSync(filepath);
        data = deserialize(data.toString());
        const obj = state.concat(data);
        fs.writeFileSync(filepath, serialize(obj));
        callback(null, obj);
      }
    } catch (e) {
      callback(e, null);
    }
  } else {
    try {
      fs.writeFileSync(filepath, serialize(state));
      callback(null, state);
    } catch (e) {
      callback(e, null);
    }
  }
}

function get(configuration, callback) {
  // console.error("IM GETTING IT");
  const nid = global.moreStatus["nid"];
  let key = null;
  let gid = "local";
  if (typeof configuration === "string") {
    key = configuration;
  } else if (configuration != null) {
    key = configuration.key;
    gid = configuration.gid;
  }

  let dir;
  if ("aws" in configuration && configuration.aws === "true") {
    dir = "/home/ubuntu/1380";
  } else {
    dir = process.cwd();
  }
  if (!key) {
    // console.log(`Key is ${key} and gid is ${gid} in store.get`);
    // return all possible keys
    const dirPath = path.join(dir, `/store/${nid}/${gid}`);
    if (!fs.existsSync(dirPath)) {
      callback(new Error("No value found for key: " + configuration), null);
      return;
    }
    const files = fs.readdirSync(dirPath);
    const data = [];

    files.forEach((file) => {
      const filepath = path.join(dirPath, file);
      // get the last part of the path
      data.push(path.basename(filepath));
      // console.log('fileData', fileData.toString());
    });
    callback(null, data);
    return;
  }

  const filepath = path.join(dir, `/store/${nid}/${gid}/${key}`);
  // console.log("GET filepath", filepath);
  // console.log(`Filepath is ${filepath}`);
  fs.readFile(filepath, (err, data) => {
    if (err) {
      console.error("Error reading file:", err, configuration);
      callback(new Error(err), null);
    } else {
      const obj = deserialize(data.toString());
      callback(null, obj);
    }
  });
}

function awsGet(configuration, callback) {
  // console.log("IM GETTING IT");
  const nid = global.moreStatus["nid"];
  let key = null;
  let gid = "local";
  if (typeof configuration === "string") {
    key = configuration;
  } else if (configuration != null) {
    key = configuration.key;
    gid = configuration.gid;
  }

  // console.log(`Key is ${key} and gid is ${gid} in store.get`);
  const dir = "/home/ubuntu/1380";
  if (!key) {
    // return all possible keys
    const dirPath = path.join(dir, `/store/${nid}/${gid}`);
    if (!fs.existsSync(dirPath)) {
      callback(new Error("No value found for key: " + configuration), null);
      return;
    }
    const files = fs.readdirSync(dirPath);
    const data = [];

    files.forEach((file) => {
      const filepath = path.join(dirPath, file);
      // get the last part of the path
      data.push(path.basename(filepath));
      // console.log('fileData', fileData.toString());
    });
    callback(null, data);
    return;
  }

  const filepath = path.join(dir, `/store/${nid}/${gid}/${key}`);
  // console.log("GET filepath", filepath);
  // console.log(`Filepath is ${filepath}`);
  fs.readFile(filepath, (err, data) => {
    if (err) {
      // console.log('Error reading file:', err, configuration);
      callback(new Error(err), null);
    } else {
      const obj = deserialize(data.toString());
      callback(null, obj);
    }
  });
}

function del(configuration, callback) {
  const nid = global.moreStatus["nid"];
  let key;
  let gid = "local";
  if (typeof configuration === "string") {
    key = configuration;
  } else if (configuration != null) {
    key = configuration.key;
    gid = configuration.gid;
  } else if (configuration == null) {
    callback(new Error("Configuration not specified"), null);
    return;
  }

  const filepath = path.join(process.cwd(), `/store/${nid}/${gid}/${key}`);

  if (!fs.existsSync(filepath)) {
    callback(new Error("No value found for key: " + configuration), null);
    return;
  } else {
    get(configuration, (err, data) => {
      if (err) {
        callback(new Error(err), null);
      } else {
        fs.unlink(filepath, (err) => {
          if (err) {
            callback(new Error(err), null);
          } else {
            callback(null, data);
          }
        });
      }
    });
  }
}

module.exports = { put, get, del, awsGet };
