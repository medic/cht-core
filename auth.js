var http = require('http'),
    db = require('./db');

module.exports = {
  getUsername: function(req, callback) {
    http.get({
      host: db.client.host,
      port: db.client.port,
      path: '/_session',
      headers: req.headers
    }, function(res) {
      res.on('data', function (chunk) {
        var name = JSON.parse(chunk).userCtx.name;
        if (name) {
          callback(null, name);
        } else {
          callback('Not logged in');
        }
      });
      res.on('error', function(e) {
        callback(e);
      });
    });
  }
};