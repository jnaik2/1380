const assert = require('assert');
const crypto = require('crypto');

// The ID is the SHA256 hash of the JSON representation of the object
function getID(obj) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(obj));
  return hash.digest('hex');
}

// The NID is the SHA256 hash of the JSON representation of the node
function getNID(node) {
  node = {ip: node.ip, port: node.port};
  return getID(node);
}

// The SID is the first 5 characters of the NID
function getSID(node) {
  return getNID(node).substring(0, 5);
}


function idToNum(id) {
  const n = parseInt(id, 16);
  assert(!isNaN(n), 'idToNum: id is not in KID form!');
  return n;
}

function naiveHash(kid, nids) {
  nids.sort();
  const n = parseInt(kid, 16);
  return nids[n % nids.length];
}

function consistentHash(kid, nids) {
  const nidsNum = nids.map(idToNum);
  nidsNum.sort((a, b) => a - b);
  const kidNum = idToNum(kid);
  let index = nidsNum.findIndex((nid) => nid >= kidNum); // return index of first element satisfying condition
  if (index === -1) {
    index = 0;
  }
  const nidNum = nidsNum[index];
  return nids.find((nid) => idToNum(nid) === nidNum);
}


function rendezvousHash(kid, nids) {
  const lst = [];

  for (const nid of nids) {
    lst.push(idToNum(getID(kid + nid)));
  }

  const max = Math.max(...lst);
  const index = lst.indexOf(max);
  return nids[index];
}

module.exports = {
  getNID: getNID,
  getSID: getSID,
  getID: getID,
  idToNum: idToNum,
  naiveHash: naiveHash,
  consistentHash: consistentHash,
  rendezvousHash: rendezvousHash,
};
