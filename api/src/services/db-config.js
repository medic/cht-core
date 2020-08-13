const request = require('request-promise-native');
const url = require('url');
const environment = require('../environment');

module.exports = {
  getConfig: async (param) => {
    const parsedUrl = url.parse(environment.couchUrl);
    const dbUrl = `${parsedUrl.protocol}//${parsedUrl.auth}@${parsedUrl.host}`;
    const nodes = await request.get({
      url: `${dbUrl}/_membership`,
      json: true
    });
    const config = await request.get({
      url: `${dbUrl}/_node/${nodes.all_nodes[0]}/_config/${param}`,
      json: true
    });
    return config;
  }
};
