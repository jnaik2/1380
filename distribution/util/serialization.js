/*
    Checklist:

    1. Serialize strings
    2. Serialize numbers
    3. Serialize booleans
    4. Serialize (non-circular) Objects
    5. Serialize (non-circular) Arrays
    6. Serialize undefined and null
    7. Serialize Date, Error objects
    8. Serialize (non-native) functions
    9. Serialize circular objects and arrays
    10. Serialize native functions
*/

function serialize(object) {
  if (typeof object == 'string') {
    return JSON.stringify({type: 'string', value: object});
  } else if (typeof object == 'number') {
    return `{"type":"number","value":"${object.toString()}"}`;
  } else if (typeof object == 'boolean') {
    return `{"type":"boolean","value":"${object.toString()}"}`;
  } else if (typeof object == 'undefined') {
    return `{"type":"undefined","value":""}`;
  } else if (object == null) {
    return `{"type":"null","value":""}`;
  } else if (typeof object == 'function') {
    return JSON.stringify({type: 'function', value: object.toString()});
  } else if (object instanceof Date) { // need to handle Date, Error, Array, etc. before Object since all are objects
    return `{"type":"date","value":"${object.toISOString()}"}`;
  } else if (object instanceof Array) {
    const serializedArray = {}; // i : serialize(object[i])
    for (let i = 0; i < object.length; i++) {
      serializedArray[i.toString()] = serialize(object[i]);
    }
    return JSON.stringify({type: 'array', value: serializedArray});
  } else if (object instanceof Error) {
    return JSON.stringify({type: 'error', value: {type: 'object', value: {name: serialize(object.name), message: serialize(object.message), cause: serialize(object.cause)}}});
  } else if (typeof object == 'object') {
    const serializedObject = {};
    for (const k in object) {
      serializedObject[k] = serialize(object[k]);
    }
    return JSON.stringify({type: 'object', value: serializedObject});
  }
}


function deserialize(string) {
  const obj = JSON.parse(string);
  if (obj.type == 'string') {
    return obj.value;
  } else if (obj.type == 'number') {
    return Number(obj.value);
  } else if (obj.type == 'boolean') {
    if (obj.value == 'true') {
      return true;
    } return false;
  } else if (obj.type == 'null') {
    return null;
  } else if (obj.type == 'undefined') {
    return undefined;
  } else if (obj.type == 'function') {
    return Function(`return ${obj.value}`)();
  } else if (obj.type == 'date') {
    return new Date(obj.value);
  } else if (obj.type == 'array') {
    const arr = [];
    for (let i = 0; i < Object.keys(obj.value).length; i++) {
      arr.push(deserialize(obj.value[i.toString()]));
    }
    return arr;
  } else if (obj.type == 'error') {
    const er = new Error(deserialize(obj.value.value.message));
    er.name = deserialize(obj.value.value.name);
    er.cause = deserialize(obj.value.value.cause);
    return er;
  } else if (obj.type == 'object') {
    const o = {};
    for (const k in obj.value) {
      o[k] = deserialize(obj.value[k]);
    }
    return o;
  }
}

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};
