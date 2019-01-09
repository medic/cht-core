const req = require('request');
const util = require('util');
const post = util.promisify(req.post);
const opts = {url: '', json: {}};

module.exports = (url) => {
  opts.url = url;
  return {
    send: async (msg) => {
      opts.json.text = msg;
      return post(opts);
    }
  };
};
