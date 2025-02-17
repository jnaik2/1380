const local = require("../local/local");

/** @typedef {import("../types").Callback} Callback */

/**
 * @typedef {Object} Target
 * @property {string} service
 * @property {string} method
 */

/**
 * @param {object} config
 * @return {object}
 */
function comm(config) {
  const context = {};
  context.gid = config.gid || "all";

  /**
   * @param {Array} message
   * @param {object} configuration
   * @param {Callback} callback
   */
  function send(message, configuration, callback) {
    let callBack = callback || console.log;
    const responses = {};
    const errors = {};
    local.groups.get(context.gid, (_, group) => {
      let numResponses = 0;
      let numErrors = 0;
      for (const sid in group) {
        const node = group[sid];
        local.comm.send(
          message,
          { ...configuration, node: node },
          (error, response) => {
            if (error) {
              errors[node.sid] = error;
              numErrors++;
            } else {
              responses[node.sid] = response;
            }
            numResponses++;

            if (numResponses === Object.keys(group).length) {
              callBack(numErrors === 0 ? null : errors, responses);
            }
          }
        );
      }
    });
  }

  return { send };
}

module.exports = comm;
