const redactBasicAuth = require('redact-basic-auth');

module.exports = (...args) => logAtLevel('\x1b[2m', 'TRACE', ...args);
module.exports.error = (...args) => logAtLevel('\x1b[31m', 'ERROR', ...args);
module.exports.info = (...args) => logAtLevel('\x1b[32m', 'INFO', ...args);
module.exports.trace = module.exports;
module.exports.warn = (...args) => logAtLevel('\x1b[33m', 'WARN', ...args);

function logAtLevel(color, level, ...args) {
  args.unshift(color + level);
  args.push('\x1b[0m'); // reset color to terminal default
  console.log.apply(console.log, args.map(redactUrls));
}

const redactUrls = s => {
  if(s instanceof Error) s = s.toString();
  else if(s && typeof s !== 'string') s = JSON.stringify(s);
  return s && redactBasicAuth(s);
};
