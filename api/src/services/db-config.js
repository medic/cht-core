/* eslint-disable no-console */
const axios = require('axios');
const environment = require('../environment');
const url = require('url');

module.exports = {
  getConfig: async () => {
    const parsedUrl = url.parse(environment.couchUrl);
    console.log(parsedUrl);
    // const resp = await axios.get(`${parsedUrl}`);
    return 'resp';
  }
};
