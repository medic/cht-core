var http = require('http'),
    db = require('./db');

module.exports = {

  getUserCtx: function(req, callback) {

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
          callback(null, auth.userCtx);
        } else {
          callback('Not logged in');
        }
      });

      res.on('error', function(e) {
        callback(e);
      });

    }).on('error', function(e) {
      callback(e.message);
    });

  },

  checkUrl: function(req, callback) {

    if (!req.params || !req.params.path) {
      return callback('No path given');
    }

    http.request({
      method: 'HEAD',
      host: db.client.host,
      port: db.client.port,
      path: req.params.path,
      headers: req.headers
    }, function(res) {
      callback(null, { status: res.statusCode } );
    }).on('error', function(e) {
      callback(e.message);
    }).end();

  }

};