const post = require('./post');
const opts = {url: '', json: {}};

module.exports = (url) => {
  opts.url = url;
  return {
    send: async (msg) => {
      opts.json.text = msg;
      return await post(opts);
    }
  };
};
