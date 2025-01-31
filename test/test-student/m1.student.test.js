/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const util = distribution.util;

test('(1 pts) student test', () => {
  // Tests that strings don't get parsed into their seeming values
    const object = ["true", "3", "undefined", "null"]
    expect(util.deserialize(util.serialize(object))).toStrictEqual(object);
});


test('(1 pts) student test', () => {
  // Edge case with numbers: negative values, decimals, Infinity, NaN
  const arr = [-30, 2.1349, Infinity, NaN, -0]
  const comparison = util.deserialize(util.serialize(arr))
  for (let index = 0; index < arr.length; index++) {
    const element = arr[index];
    if (index != 3) {
      expect(comparison[index] == arr[index]).toBe(true);
    } else {
      expect(Number.isNaN(comparison[3])).toBe(true)
    }
  }
});


test('(1 pts) student test', () => {
  // Makes sure that serialization does not modify the original array (e.g. immutable)
  const x = {}
  const arr = [-30, "hi", x, undefined]
  const _ = util.deserialize(util.serialize(arr))
  expect(arr[0] == -30).toBe(true);
  expect(arr[1] == "hi").toBe(true);
  expect(arr[2] == x).toBe(true);
  expect(arr[3] == undefined).toBe(true);
});

test('(1 pts) student test', () => {
  // Ensures that cyclic structures maintain references even after modifying object
  const object = { "a": {} }
  object["self"] = object["a"]
  const compare = util.deserialize(util.serialize(object))
  compare["a"]["hello"] = 3
  expect(compare["self"]["hello"]).toBe(3)
});

test('(1 pts) student test', () => {
  // Tests structure with multiple cycles that are all correct
  const x = { "w": {} }
  x["self"] = x
  x["g"] = x["w"]
  x["w"]["nested"] = x["g"]

  const compare = util.deserialize(util.serialize(x))

  expect(compare["self"] === compare && compare["g"] === compare["w"] && compare["w"] === compare["w"]["nested"]).toStrictEqual(true)
  
});
