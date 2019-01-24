const req = require('request');
const {promisify} = require('util');
const post = promisify(req.post);

module.exports = post;
