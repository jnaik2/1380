/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/
const {id, serialize, deserialize} = require('../util/util');
const fs = require('fs');
const path = require('path');


function put(state, configuration, callback) {
  const nid = global.moreStatus['nid'];
  let key;
  let gid = 'local';
  if (typeof configuration === 'string') {
    key = configuration;
  } else if (configuration != null) {
    key = configuration.key;
    gid = configuration.gid;
  }

  if (!key) {
    key = id.getID(state);
  }


  const filepath = path.join(process.cwd(), `/store/${nid}/${gid}/${key}`);
  const dirPath = path.dirname(filepath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, {recursive: true});
  }

  fs.writeFile(filepath, serialize(state), (err) => {
    if (err) {
      callback(new Error(err), null);
    } else {
      callback(null, state);
    }
  });
}

function get(configuration, callback) {
  const nid = global.moreStatus['nid'];
  let key;
  let gid = 'local';
  if (typeof configuration === 'string') {
    key = configuration;
  } else if (configuration != null) {
    key = configuration.key;
    gid = configuration.gid;
  } else if (configuration == null) {
    callback(new Error('Configuration not specified'), null);
    return;
  }

  const filepath = path.join(process.cwd(), `/store/${nid}/${gid}/${key}`);
  fs.readFile(filepath, (err, data) => {
    if (err) {
      callback(new Error(err), null);
    } else {
      const obj = deserialize(data.toString());
      callback(null, obj);
    }
  });
}

function del(configuration, callback) {
  const nid = global.moreStatus['nid'];
  let key;
  let gid = 'local';
  if (typeof configuration === 'string') {
    key = configuration;
  } else if (configuration != null) {
    key = configuration.key;
    gid = configuration.gid;
  } else if (configuration == null) {
    callback(new Error('Configuration not specified'), null);
    return;
  }

  const filepath = path.join(process.cwd(), `/store/${nid}/${gid}/${key}`);

  if (!fs.existsSync(filepath)) {
    callback(new Error('No value found for key: ' + configuration), null);
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

module.exports = {put, get, del};
