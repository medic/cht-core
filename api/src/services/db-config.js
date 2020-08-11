const axios = require('axios');
const environment = require('../environment');
const url = require('url');

module.exports = {
  getConfig: async (param) => {
    const parsedUrl = url.parse(environment.couchUrl);
    const dbUrl = `${parsedUrl.protocol}//${parsedUrl.auth}@${parsedUrl.host}`;
    const nodes = await axios.get(`${dbUrl}/_membership`);
    const config = await axios.get(`${dbUrl}/_node/${nodes.data.all_nodes[0]}/_config/${param}`);
    return config;
  }
};
