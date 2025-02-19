# distribution

This is the distribution library. When loaded, distribution introduces functionality supporting the distributed execution of programs. To download it:

## Installation

```sh
$ npm i '@brown-ds/distribution'
```

This command downloads and installs the distribution library.

## Testing

There are several categories of tests:

- Regular Tests (`*.test.js`)
- Scenario Tests (`*.scenario.js`)
- Extra Credit Tests (`*.extra.test.js`)
- Student Tests (`*.student.test.js`) - inside `test/test-student`

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
distribution.local.status.get("sid", console.log); // 8cf1b
```

You can also store and retrieve values from the local memory:

```js
distribution.local.mem.put({ name: "nikos" }, "key", console.log); // {name: 'nikos'}
distribution.local.mem.get("key", console.log); // {name: 'nikos'}
```

You can also spawn a new node:

```js
let node = { ip: "127.0.0.1", port: 8080 };
distribution.local.status.spawn(node, console.log);
```

Using the `distribution.all` set of services will allow you to act
on the full set of nodes created as if they were a single one.

```js
distribution.all.status.get("sid", console.log); // { '8cf1b': '8cf1b', '8cf1c': '8cf1c' }
```

You can also send messages to other nodes:

```js
distribution.all.comm.send(
  ["sid"],
  { node: node, service: "status", method: "get" },
  console.log
); // 8cf1c
```

# Results and Reflections

# M1: Serialization / Deserialization

## Summary

My implementation comprises `2` software components, totaling `150` lines of code. Key challenges included `deserializing functions, finding all native objects, and handling cycles`. To deserialize functions, I had to combine the original function's code as a string, but also wrap it with something like Function("return ", originalString)() so that way anonymous functions wouldn't get ignored or just undefined. I was under the impression simply doing Function(originalString) would convert it to a function but it didn't work properly if I tried to execute it after. To find all native objects, I preprocessed the built in libraries list and checked if the library was a function/object and if it was an object I recursively parsed further and added it to my hashmaps. Handling cycles was difficult because I didn't know how to generate/track the UEID and I had to split my code into two components. An exposed serialize/deserialize function & a helper, recursive serialize/deserialize function that used a hashmap to track the references.

## Correctness & Performance Characterization

_Correctness_: I wrote `5` tests in m1.studen.test.js. My tests include objects with base support like strings & numbers, but also complex types like objects, arrays,
and native functions. I also handled recursive & cylic structures in my tests. Some of my tests focused on edge cases.

_Performance_: The latency of various subsystems is described in the `"latency"` portion of package.json. The characteristics of my development machines are summarized in the `"dev"` portion of package.json. The first value represents a workload using only base values (T2), the second value is for function values (T3), and the third value is for the complete complex workload (T4). See performance/m1.js for how it was measured

# M2: Actors and Remote Procedure Calls (RPC)

## Summary

My implementation comprises `4` software components, totaling `300` lines of code. Key challenges included understanding continuation functions, implementing the service objects, and designing a server. The handout does not describe **what** the service methods are, so I had to use trial and error along with scenario/test analysis to understand, for example, what the routes.put or routes.rem method does. I also gained a lot of familiarity with continuation functions, as this was a new programming paradigm for me. I had to avoid returning values and instead perform callbacks, which required a lot of attention to detail on control flows & error handling. I also designed the server which was challenging since it was a module (http) I never worked with before. The 4 components are status, routes, comm, and node.

## Correctness & Performance Characterization

_Correctness_: I wrote `10` tests. The first test is for status.get, the second - fourth cover routes including both unit tests (e.g. just testing routes.rem) and nested interactions. The fifth test covers comm.send

_Performance_: I characterized the performance of comm and RPC by sending 1000 service requests in a tight loop. Average throughput and latency is recorded in `package.json`. The first number represents comm & the second represents RPC.

## Key Feature

> How would you explain the implementation of `createRPC` to someone who has no background in computer science — i.e., with the minimum jargon possible?

createRPC is essentially a way for two computers to communicate not just data, but tasks. Let's say you are super knowledgable about history. I could ask you a bunch of questions on my topic, let's say American independence, and piece together your answers to better understand the topic. But, since you are knowledgable, I could just outsource my paper topic on American independence to you, and then get the finished product. createRPC is like outsourcing the big dirty work (e.g. a paper) as opposed to combining the small work yourself (e.g. request/responses)

# M3: Node Groups & Gossip Protocols

## Summary

My implementation comprises `8` new software components, totaling `300` added lines of code over the previous implementation. The new components include distributed & modified local versions of groups, comm, routes, and status. The key challenges I faced was managing `1` the routes and new distributed services. I handled this by instantiating a global distribution object per GID that I then could access as necessary for distributed services, but using the routeMap for local services. Another challenge `2` was implementing distributed services, especially comm.send. This was challenging because it required me to think about concurrency and how I could collect the results from multiple nodes. The next challenge that resulted from this was `3` modifying how I handled errors. Since distributed services could collect errors across multiple nodes, I couldn't just check if err was null, I had to wrap it in an object and then check.

## Correctness & Performance Characterization

_Correctness_ -- I included 5 tests. The tests test my distributed implementations in a variety of settings. They all run under 5 seconds.

## Key Feature

> What is the point of having a gossip protocol? Why doesn't a node just send the message to _all_ other nodes in its group?

The point of a gossip protocol is to allow for scalable communication in massive networks of nodes. If a node sends all messages to all nodes, it would result in too many messages that would not scale well for large groups. Gossip protocols still promise convergence, but they don't send overwhelming amounts of messages so they can scale to any size.
