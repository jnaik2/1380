/** @typedef {import("../types").Callback} Callback */

function routes(config) {
  const context = {};
  context.gid = config.gid || 'all';

  /**
   * @param {object} service
   * @param {string} name
   * @param {Callback} callback
   */
  function put(service, name, callback = () => {}) {
    const callBack = callback || console.log;
    const remote = {service: 'routes', method: 'put'};

    global.distribution[context.gid].comm.send(
        [service, name],
        remote,
        (errorMap, responseMap) => {
          callBack(errorMap, responseMap);
        },
    );
  }

  /**
   * @param {string} name
   * @param {Callback} callback
   */
  function rem(name, callback = () => { }) {
    global.distribution[context.gid].comm.send(
        [name],
        {service: 'routes', method: 'rem'},
        (errorMap, responseMap) => {
          callback(errorMap, responseMap);
        },
    );
  }

  return {put, rem};
}

module.exports = routes;
