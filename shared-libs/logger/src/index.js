const DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS';
const create = () => {
  if (!process || process.browser) {
    return console;
  }

  return require('./node-logger').create(DATE_FORMAT);
};

module.exports = create();
module.exports.DATE_FORMAT = DATE_FORMAT;
