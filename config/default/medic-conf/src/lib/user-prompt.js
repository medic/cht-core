const environment = require('./environment');
const readline = require('readline-sync');


/**
 * Display a query to the user if it's specified, and then return a
 * boolean or an empty string immediately a key was pressed by the user,
 * without pressing the Enter key.
 * If `medic-conf` was called with the `--force` argument, `true`
 * is immediately returned without displaying any message and without
 * waiting the user confirmation.
 * @param {string=} query - the message, by default 'Are you sure? '
 *        is used
 * @param {Object=} options - options to pass `readlineSync.keyInYN`
 *        (see https://www.npmjs.com/package/readline-sync#basic-options)
 * @returns {boolean|string}
 */
function keyInYN(query, options) {
  if (environment.force) {
    return true;
  }
  return readline.keyInYN(query, options);
}

function question(question, options = {}) {
  return readline.question(question, options);
}

function keyInSelect(items, question, options = {}) {
  if (environment.force) {
    return -1;
  }
  return readline.keyInSelect(items, question, options);
}

module.exports = {
  keyInYN,
  question,
  keyInSelect
};
