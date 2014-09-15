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

      var content = [];

      res.on('data', function (chunk) {
        content.push(chunk);
      });

      res.on('end', function () {
        var auth;
        try {
          auth = JSON.parse(content.join(''));
        } catch(e) {
          return callback('Not logged in');
        }
        if (auth && auth.userCtx && auth.userCtx.name) {
          callback(null, auth.userCtx.name);
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