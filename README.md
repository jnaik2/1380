# distribution

This is the distribution library. When loaded, distribution introduces functionality supporting the distributed execution of programs. To download it:

## Installation

```sh
$ npm i '@brown-ds/distribution'
```

This command downloads and installs the distribution library.

## Testing

There are several categories of tests:
  *	Regular Tests (`*.test.js`)
  *	Scenario Tests (`*.scenario.js`)
  *	Extra Credit Tests (`*.extra.test.js`)
  * Student Tests (`*.student.test.js`) - inside `test/test-student`

### Running Tests

By default, all regular tests are run. Use the options below to run different sets of tests:

1. Run all regular tests (default): `$ npm test` or `$ npm test -- -t`
2. Run scenario tests: `$ npm test -- -c` 
3. Run extra credit tests: `$ npm test -- -ec`
4. Run the `non-distribution` tests: `$ npm test -- -nd`
5. Combine options: `$ npm test -- -c -ec -nd -t`

## Usage

To import the library, be it in a JavaScript file or on the interactive console, run:

```js
let distribution = require("@brown-ds/distribution");
```

Now you have access to the full distribution library. You can start off by serializing some values. 

```js
let s = distribution.util.serialize(1); // '{"type":"number","value":"1"}'
let n = distribution.util.deserialize(s); // 1
```

You can inspect information about the current node (for example its `sid`) by running:

```js
distribution.local.status.get('sid', console.log); // 8cf1b
```

You can also store and retrieve values from the local memory:

```js
distribution.local.mem.put({name: 'nikos'}, 'key', console.log); // {name: 'nikos'}
distribution.local.mem.get('key', console.log); // {name: 'nikos'}
```

You can also spawn a new node:

```js
let node = { ip: '127.0.0.1', port: 8080 };
distribution.local.status.spawn(node, console.log);
```

Using the `distribution.all` set of services will allow you to act 
on the full set of nodes created as if they were a single one.

```js
distribution.all.status.get('sid', console.log); // { '8cf1b': '8cf1b', '8cf1c': '8cf1c' }
```

You can also send messages to other nodes:

```js
distribution.all.comm.send(['sid'], {node: node, service: 'status', method: 'get'}, console.log); // 8cf1c
```

# Results and Reflections

# M1: Serialization / Deserialization


## Summary

My implementation comprises `2` software components, totaling `150` lines of code. Key challenges included `deserializing functions, finding all native objects, and handling cycles`. To deserialize functions, I had to combine the original function's code as a string, but also wrap it with something like Function("return ", originalString)() so that way anonymous functions wouldn't get ignored or just undefined. I was under the impression simply doing Function(originalString) would convert it to a function but it didn't work properly if I tried to execute it after. To find all native objects, I preprocessed the built in libraries list and checked if the library was a function/object and if it was an object I recursively parsed further and added it to my hashmaps. Handling cycles was difficult because I didn't know how to generate/track the UEID and I had to split my code into two components. An exposed serialize/deserialize function & a helper, recursive serialize/deserialize function that used a hashmap to track the references.


## Correctness & Performance Characterization

*Correctness*: I wrote `5` tests in m1.studen.test.js. My tests include objects with base support like strings & numbers, but also complex types like objects, arrays,
and native functions. I also handled recursive & cylic structures in my tests. Some of my tests focused on edge cases.


*Performance*: The latency of various subsystems is described in the `"latency"` portion of package.json. The characteristics of my development machines are summarized in the `"dev"` portion of package.json. The first value represents a workload using only base values (T2), the second value is for function values (T3), and the third value is for the complete complex workload (T4). See performance/m1.js for how it was measured
