/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require("../../config.js");
const id = distribution.util.id;

const n1 = { ip: "127.0.0.1", port: 8000 };
const n2 = { ip: "127.0.0.1", port: 8001 };
const n3 = { ip: "127.0.0.1", port: 8002 };
const allNodes = [n1, n2, n3];

test("(1 pts) student test", (done) => {
  // Create a group with nodes n1, n2, n3 and ensure all nodes have same group membership view

  const groupA = {};
  groupA[id.getSID(n1)] = n1;
  groupA[id.getSID(n2)] = n2;
  groupA[id.getSID(n3)] = n3;

  distribution.local.groups.put("groupA", groupA, (e, v) => {
    distribution.groupA.groups.put("groupA", groupA, (e, v) => {
      try {
        Object.values(v).forEach((view) => {
          expect(Object.keys(view).length).toEqual(3);
        });
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

test("(1 pts) student test", (done) => {
  // Create a group with nodes n1, n2, n3, and then add a new service to the group,
  // and try to execute new service locally but catch an error

  const groupA = {};
  groupA[id.getSID(n1)] = n1;
  groupA[id.getSID(n2)] = n2;
  groupA[id.getSID(n3)] = n3;

  const echoService = {};

  echoService.echo = () => {
    return "echo!";
  };

  distribution.local.groups.put("groupA", groupA, (e, v) => {
    distribution.groupA.groups.put("groupA", groupA, (e, v) => {
      distribution.groupA.routes.put(echoService, "echo", (e, v) => {
        distribution.local.comm.send(
          ["echo"],
          { node: n1, service: "echoService", method: "echo" },
          (e, v) => {
            expect(e).toBeTruthy();
            done();
          }
        );
      });
    });
  });
});

test("(1 pts) student test", (done) => {
  // Create a group with nodes n1, n2, n3, and then add a new service to the group,
  // and successfully execute the new service remotely

  const groupA = {};
  groupA[id.getSID(n1)] = n1;

  const echoService = {};
  echoService.echo = (callback) => {
    callback(null, "echo!");
    return;
  };

  distribution.local.groups.put("groupA", groupA, (e, v) => {
    distribution.groupA.routes.put(echoService, "echo", (e, v) => {
      distribution.local.comm.send(
        [],
        { node: n1, service: "echo", method: "echo" },
        (e, v) => {
          expect(e).toBeFalsy();
          expect(v).toEqual("echo!");
          done();
        }
      );
    });
  });
});

test("(1 pts) student test", (done) => {
  // Create a group with nodes n1, n2, n3 locally but not remotely
  // Try to get the group remotely and catch an error

  const groupA = {};
  groupA[id.getSID(n1)] = n1;
  groupA[id.getSID(n2)] = n2;
  groupA[id.getSID(n3)] = n3;

  distribution.local.groups.put("groupA", groupA, (e, v) => {
    distribution.groupA.groups.get("groupA", (e, v) => {
      expect(e).toBeTruthy();
      done();
    });
  });
});

test("(1 pts) student test", (done) => {
  // Create a group with nodes n1. Delete the group and recreate with n2. Make sure
  // n1 not in the group

  const groupA = {};
  groupA[id.getSID(n1)] = n1;

  distribution.local.groups.put("groupA", groupA, (e, v) => {
    distribution.local.groups.del("groupA", (e, v) => {
      const groupB = {};
      groupB[id.getSID(n2)] = n2;
      distribution.local.groups.put("groupA", groupB, (e, v) => {
        distribution.local.groups.get("groupA", (e, v) => {
          expect(v).toEqual(groupB);
          done();
        });
      });
    });
  });
});

let localServer = null;

function startAllNodes(callback) {
  distribution.node.start((server) => {
    localServer = server;

    function startStep(step) {
      if (step >= allNodes.length) {
        callback();
        return;
      }

      distribution.local.status.spawn(allNodes[step], (e, v) => {
        if (e) {
          callback(e);
        }
        startStep(step + 1);
      });
    }
    startStep(0);
  });
}

function stopAllNodes(callback) {
  const remote = { method: "stop", service: "status" };

  function stopStep(step) {
    if (step == allNodes.length) {
      callback();
      return;
    }

    if (step < allNodes.length) {
      remote.node = allNodes[step];
      distribution.local.comm.send([], remote, (e, v) => {
        stopStep(step + 1);
      });
    }
  }

  if (localServer) localServer.close();
  stopStep(0);
}

beforeAll((done) => {
  // Stop any leftover nodes
  stopAllNodes(() => {
    startAllNodes(done);
  });
});

afterAll((done) => {
  stopAllNodes(done);
});
