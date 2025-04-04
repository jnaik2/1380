/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/
const {Console} = require('console');
const {id, serialize, deserialize} = require('../util/util');
const fs = require('fs');
const path = require('path');


function put(state, configuration, callback) {
  const nid = global.moreStatus['nid'];
  let key;
  let gid = 'local';
  console.log(`IN LOCAL STORE PUT: ${JSON.stringify(state)} and configuration is ${JSON.stringify(configuration)}`);
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
  // console.log('FILEPATH FOR SAVING IN LOCAL STORE PUT IS: ', filepath);
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
  }

  if (!key) {
    key = id.getID(state);
  }

  // 7ff68db30ff9983a2fd3d464d8f53d468d3089e20bb1f0637bed8cb5425a2318/avgwrdl/doca
  // 7ff68db30ff9983a2fd3d464d8f53d468d3089e20bb1f0637bed8cb5425a2318/avgwrdl/doca


  const filepath = path.join(process.cwd(), `/store/${nid}/${gid}/${key}`);
  // console.log('FILEPATH FOR GETTING IN LOCAL STORE GET IS: ', filepath);

  fs.readFile(filepath, (err, data) => {
    if (err) {
      callback(new Error(err), null);
    } else {
      // console.log('G1 IN STORE GET IS: ', data.toString());
      const obj = deserialize(data.toString());
      // console.log('G2 IN STORE GET IS: ', obj);
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
  }

  if (!key) {
    key = id.getID(state);
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
