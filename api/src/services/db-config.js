const request = require('request'),
      path = require('path'),
      db = require('../db-pouch'),
      { COUCH_NODE_NAME='nonode@nohost' } = process.env;

module.exports = {
  get: (section='', key='') => {
    return new Promise((resolve, reject) => {
      const fullPath = path.join('_node', COUCH_NODE_NAME, '_config', section, key);
      const fullUrl = `${db.serverUrl}/${fullPath}`;
      request.get({ url: fullUrl, json: true }, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          reject(err || body);
        } else {
          resolve(body);
        }
      });
    });
  }
};
