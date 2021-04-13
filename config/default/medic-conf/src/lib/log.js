/* eslint-disable no-console */
const redactBasicAuth = require('redact-basic-auth');

const NONE  = -1;
const ERROR =  0;
const WARN  =  1;
const INFO  =  2;
const TRACE =  3;

module.exports = (...args)       => module.exports.level >= TRACE && logAtLevel('\x1b[2m', 'TRACE', ...args);

module.exports.LEVEL_NONE  = NONE;
module.exports.LEVEL_ERROR = ERROR;
module.exports.LEVEL_WARN  = WARN;
module.exports.LEVEL_INFO  = INFO;
module.exports.LEVEL_TRACE = TRACE;

// Log everything by default
module.exports.level = TRACE;

module.exports.error = (...args) => module.exports.level >= ERROR && logAtLevel('\x1b[31m', 'ERROR', ...args);
module.exports.info = (...args)  => module.exports.level >= INFO  && logAtLevel('\x1b[32m', 'INFO', ...args);
module.exports.trace = module.exports;
module.exports.warn = (...args)  => module.exports.level >= WARN  && logAtLevel('\x1b[33m', 'WARN', ...args);

function logAtLevel(color, level, ...args) {
  args.unshift(color + level);
  args.push('\x1b[0m'); // reset color to terminal default
  console.log.apply(console.log, args.map(redactUrls));
}

const redactUrls = s => {
  if(s instanceof Error) s = s.stack || s.message || s;
  if(s && typeof s !== 'string') s = JSON.stringify(s, null, 2);
  return s && redactBasicAuth(s);
};
