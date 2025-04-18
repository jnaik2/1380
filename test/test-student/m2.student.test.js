/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require("../../distribution");
test("(1 pts) student test", (done) => {
  // Test status with a missing configuration to ensure error handling
  distribution.local.status.get(null, (e, v) => {
    try {
      expect(e).toBeTruthy();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
    } catch (error) {
      done(error);
    }
  });

  // Test status on nid
  distribution.local.status.get("nid", (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(v).toBeTruthy();
      done();
    } catch (error) {
      done(error);
    }
  });
});

test("(1 pts) student test", (done) => {
  // Test routes put() then rem() then get() to ensure the service is removed
  const routes = distribution.local.routes;

  const testService = {};

  testService.method = () => {
    return "method";
  };
  routes.put(testService, "method", (_, v) => {
    routes.rem(v, (_, v) => {
      routes.get(v, (e, v) => {
        try {
          expect(e).toBeTruthy();
          expect(e).toBeInstanceOf(Error);
          expect(e.message).toBe("Value not accessible in service");
          expect(v).toBeFalsy();
        } catch (error) {
          done(error);
        }
      });
    });
  });

  // Test routes consecutive puts to ensure the service is updated with latest

  const testService1 = {};
  const testService2 = {};

  testService1.method = () => {
    return "method1";
  };
  testService2.method = () => {
    return "method2";
  };
  routes.put(testService1, "method", (_, v) => {
    routes.put(testService2, "method", (_, v) => {
      routes.get(v, (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v).toBe(testService2);
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});

test("(1 pts) student test", (done) => {
  // Test removing a non existent service to ensure error handling
  const routes = distribution.local.routes;

  routes.rem("nonexistent", (e, v) => {
    try {
      expect(e).toBeTruthy();
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toBe("Value not accessible in service");
      expect(v).toBeFalsy();
      done();
    } catch (error) {
      done(error);
    }
  });
});

test("(1 pts) student test", (done) => {
  // Test routes.get() with missing configuration to ensure error handling
  const routes = distribution.local.routes;

  routes.get(null, (e, v) => {
    try {
      expect(e).toBeTruthy();
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toBe("Configuration not specified");
      expect(v).toBeFalsy();
      done();
    } catch (error) {
      done(error);
    }
  });
});

test("(1 pts) student test", (done) => {
  // Test send() with missing method to ensure error handling
  const node = distribution.node.config;
  let remote = { node: node, service: "status" };
  let message = ["invalid"];

  distribution.local.comm.send(message, remote, (e, v) => {
    try {
      expect(e).toBeTruthy();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
    } catch (error) {
      done(error);
    }
  });

  // Test send() with missing node to ensure error handling
  remote = { service: "status", method: "get" };
  message = ["sid"];

  distribution.local.comm.send(message, remote, (e, v) => {
    try {
      expect(e).toBeTruthy();
      expect(e).toBeInstanceOf(Error);
      expect(v).toBeFalsy();
      done();
    } catch (error) {
      done(error);
    }
  });
});

let localServer = null;

beforeAll((done) => {
  distribution.node.start((server) => {
    localServer = server;
    done();
  });
});

afterAll((done) => {
  localServer.close();
  done();
});
