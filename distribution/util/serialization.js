#!/usr/bin/env node
/*
    Checklist:
    7. Serialize Date, Error objects
    9. Serialize circular objects and arrays
*/
const nativeObjectsToStr = new Map();
const strToNativeObjects = new Map();

function populateNativeObjects() {
  const builtinLibs = require(`repl`)._builtinLibs;
  builtinLibs.forEach((pkg) => {
    if (!(pkg == "sys" || pkg == "wasi")) {
      const rootObj = require(pkg);
      switch (typeof rootObj) {
        case "function":
          strToNativeObjects.set(pkg, rootObj)
          nativeObjectsToStr.set(rootObj, pkg)
          break;
        case "object":
          for (const [k, v] of Object.entries(rootObj)) {
            strToNativeObjects.set(`${pkg}.${k}`, v)
            nativeObjectsToStr.set(v, `${pkg}.${k}`)
          }
          break;
        default:
          break;
      }
    }
  })
}
populateNativeObjects()

let nextUIUD = 0;

function serialize(object) {
  return JSON.stringify(serializeRecursive(object, new Map()));
}

function serializeRecursive(object, referenceMap) {
  if (nativeObjectsToStr.has(object)) {
    return {"type": "native", "id": nextUIUD++, "value": nativeObjectsToStr.get(object) }
  }
  let type = typeof object;
  let value;
  let id = nextUIUD++;
  switch (type) {
    case "string":
    case "number":
    case "boolean":
    case "function":
      value = object.toString();
      break;
    case "undefined":
      value = "";
      break
    case "object":
      [type, value] = serializeObject(object, referenceMap)
      break
    default:
      value = `tried to serialize a type that is not supported: ${type}`
      type = "error"
      break;
  }
  return {"type": type, "id": id, "value": value}
}

function serializeObject(object, referenceMap) {
  if (object == null) {
    return ["null", ""]
  } else if (object instanceof Date) {
    return ["date", object.toISOString()]
  } else if (object instanceof Error) {
    return ["error", object.message]
  } else if (object instanceof Array) {
    if (referenceMap.has(object)) {
      return ["reference", referenceMap.get(object)]
    }
    referenceMap.set(object, nextUIUD - 1);
    return ["array", object.map(item => serializeRecursive(item, referenceMap))]
  } else {
    if (referenceMap.has(object)) {
      return ["reference", referenceMap.get(object)]
    }
    let newObject = {}
    referenceMap.set(object, nextUIUD - 1)
    Object.entries(object).forEach(([k, v]) => newObject[k] = serializeRecursive(v, referenceMap))
    return ["object", newObject]
  }
}

function deserialize(string) {
  const json = JSON.parse(string);
  return deserializeRecursive(json, new Map())
}

function deserializeRecursive(json, referenceMap) {
  const value = json["value"], id = json["id"], type = json["type"];
  switch (type) {
    case "number":
      return Number(value)
    case "boolean":
    case "string":
      return value
    case "undefined":
      return undefined
    case "null":
      return null
    case "function":
      return new Function("return " + value)()
    case "date":
      return new Date(value)
    case "error":
      return new Error(value)
    case "array":
      return value.map(item => deserializeRecursive(item, referenceMap))
    case "native":
      return strToNativeObjects.get(value)
    case "reference":
      return referenceMap.get(value)
    case "object":
      referenceMap.set(id, value)
      for (const [k, v] of Object.entries(value)) {
        value[k] = deserializeRecursive(v, referenceMap)
      }
      return value
    default:
      return new Error(`Attempted to deserialize unsupported type: ${type}`)
  }
}

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};
  