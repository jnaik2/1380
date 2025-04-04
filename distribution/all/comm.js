const local = require('../local/local');

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
  context.gid = config.gid || 'all';

  /**
   * @param {Array} message
   * @param {object} configuration
   * @param {Callback} callback
   */
  function send(message, configuration, callback) {
    callback = callback || console.log;
    console.log(
        `Sending message ${JSON.stringify(message)} to ${context.gid} with configuration:`,
        configuration,
    );
    const responses = {};
    const errors = {};
    local.groups.get(context.gid, (_, group) => {
      console.log(`Group ${context.gid} members:`, group);
      let numResponses = 0;
      for (const sid in group) {
        const node = group[sid];
        local.comm.send(
            message,
            {...configuration, node: node},
            (error, response) => {
              if (error) {
                errors[sid] = error;
              } else {
                responses[sid] = response;
              }
              numResponses++;

              if (numResponses == Object.keys(group).length) {
                callback(errors, responses);
              }
            },
        );
      }
    });
  }

  return {send};
}

module.exports = comm;
