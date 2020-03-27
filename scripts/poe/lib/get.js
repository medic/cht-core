const req = require('request');
const {promisify} = require('util');
const get = promisify(req.get);

module.exports = get;
