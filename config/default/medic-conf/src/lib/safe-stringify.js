const jsonStringifySafe = require('json-stringify-safe');

/**
 * @return JSON string with circular references ignored
 */
// the first three params are the same as JSON.stringify
// the fourth param defines what to replace circular refs with
module.exports = (obj) => jsonStringifySafe(obj, null, 2, () => undefined);
