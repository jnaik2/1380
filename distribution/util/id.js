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
  // console.log('IN CONSISTENT HASH');
  // console.log(nids);
  const ring = [];
  for (const nid of nids) {
    ring.push({originalId: nid, val: idToNum(nid)});
  }
  // let newKid = kid.substring(0, 5);
  // console.log(newKid);
  ring.push({originalId: kid, val: idToNum(kid)});

  ring.sort((a, b) => a.val-b.val);

  const indexOfKid = ring.findIndex((elm) => elm.originalId === kid);

  // console.log(indexOfKid);
  // console.log(ring.length);
  let indexNeeded;
  if (indexOfKid === ring.length-1) {
    indexNeeded = 0;
  } else {
    indexNeeded = indexOfKid+1;
  }
  // console.log(`Ring is ${JSON.stringify(Object.values(ring))}`);
  // console.log(ring[indexNeeded].originalId);
  return ring[indexNeeded].originalId;
}


function rendezvousHash(kid, nids) {
  let max = 0;
  let index = 0;
  for (let i = 0; i < nids.length; i++) {
    const hash = idToNum(getID(kid + nids[i]));
    if (hash > max) {
      index = i;
      max = hash;
    }
  }
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
