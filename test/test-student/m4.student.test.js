/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');

test('(1 pts) student test', (done) => {
  // Test local.mem.put & get with two different GIDS
  const user = { first: 'Josiah', last: 'Carberry' };
  const user2 = { first: 'Josiah', last: 'dada' };
  const key = 'jcarbmpg';
  const key2 = 'jcarbmpg';

  distribution.local.mem.put(user, { key: key, gid: "test1" }, (e, v) => {
    
    distribution.local.mem.put(user2, {key: key2, gid: "test2"}, (e, v) => {
      distribution.local.mem.get({key: key, gid: "test2"}, (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v).toBe(user2);
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});


test('(1 pts) student test', (done) => {
  // Test local.store.put & get with two different GIDS
  const user = { first: 'Josiah', last: 'Carberry' };
  const user2 = { first: 'Josiah', last: 'dada' };
  const key = 'jcarbsp';
  const key2 = 'jcarbsp';


  distribution.local.store.put(user, { key: key, gid: "test1" }, (e, v) => {

    distribution.local.store.put(user2, {key: key2, gid: "test2"}, (e, v) => {
      distribution.local.store.get({key: key, gid: "test2"}, (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v).toStrictEqual(user2);
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});


test('(1 pts) student test', (done) => {
  // Put in one GID, and try to del from another GID with an error
  const user = { first: 'Josiah', last: 'Carberry' };
  const key = 'jcarbsp';

  distribution.local.store.put(user, { key: key, gid: "test3" }, (e, v) => {
    distribution.local.store.del({key: key, gid: "test4"}, (e, v) => {
      try {
        expect(v).toBeFalsy();
        expect(e).toBeInstanceOf(Error);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  // Put in one GID, and try to del from another GID with an error
    const user = { first: 'Josiah', last: 'Carberry' };
  const key = 'jcarbsp';

  distribution.local.mem.put(user, { key: key, gid: "test3" }, (e, v) => {
    distribution.local.mem.del({key: key, gid: "test4"}, (e, v) => {
      try {
        expect(v).toBeFalsy();
        expect(e).toBeInstanceOf(Error);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

test('(1 pts) student test', (done) => {
  // Distributed mem put in several nodes, distributed put another value in several nodes,
  // then get both values from a specific node
  const user = { first: 'Josiah', last: 'Carberry' };
  const user2 = { first: 'Josiah', last: 'dada' };
  const key = 'jcarbmpg';
  const key2 = 'jcarbmpg';

  distribution.local.mem.put(user, { key: key, gid: "test1" }, (e, v) => {
    distribution.local.mem.put(user2, {key: key2, gid: "test2"}, (e, v) => {
      distribution.local.mem.get({ key: key, gid: "test2" }, (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v).toBe(user2);
        } catch (error) {
          done(error);
        }
        distribution.local.mem.get({ key: key2, gid: "test1" }, (e, v) => {
          try {
            expect(e).toBeFalsy();
            expect(v).toBe(user);
            done();
          } catch (error) {
            done(error);
          }
        });
      });
    });
  });
});
