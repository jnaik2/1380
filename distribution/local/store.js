/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/
const { id, serialize, deserialize } = require("../util/util");
const fs = require('fs');
const path = require('path');


function put(state, configuration, callback) {
  let nid = global.moreStatus["nid"];
  let key = configuration;
  if (!configuration) {
    key = id.getID(state);
  }

  let filepath = path.join(process.cwd(), `/store/${nid}/${key}`);
  let dirPath = path.dirname(filepath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, {recursive: true});
  }

  fs.writeFile(filepath, serialize(state), (err) => {
    if (err) {
      callback(new Error(err), null);
    } else {
      callback(null, state);
    }
  })
}

function get(configuration, callback) {
  let nid = global.moreStatus["nid"];
  let filepath = path.join(process.cwd(), `/store/${nid}/${configuration}`);
  fs.readFile(filepath, (err, data) => {
    if (err) {
      callback(new Error(err), null);
    } else {
      let obj = deserialize(data.toString());
      callback(null, obj);
    }
  })
}

function del(configuration, callback) {
  let nid = global.moreStatus["nid"];
  let filepath = path.join(process.cwd(), `/store/${nid}/${configuration}`);

  if (!fs.existsSync(filepath)) {
    callback(new Error("No value found for key: " + configuration), null);
    return
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
        })
      }
    })

  }
}

module.exports = {put, get, del};
