const post = require('./post');
const opts = {url: '', json: {}};

module.exports = (url) => {
  opts.url = url;
  return {
    send: async (msg) => {
      if (url && url.length) {
        opts.json.text = msg;
        return await post(opts);
      }
      console.log('Slack channel not defined (.env). Unable to notify.');
    }
  };
};
