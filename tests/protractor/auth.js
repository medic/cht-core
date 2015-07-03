var http = require('http'),
    url = require('url'),
    auth = '';

var getKansorc = function() {
  try {
    return require('../../.kansorc');
  } catch(e) {}
};

module.exports = {
  getAuth: function() {
    return auth;
  },
  setup: function() {
    var deferred = protractor.promise.defer();

    var kansorc = getKansorc();
    if (kansorc) {
      var dbUrl = kansorc.env && kansorc.env.default && kansorc.env.default.db;
      if (!dbUrl) {
        console.error('.kansorc must have db url configured');
        deferred.reject();
      } else {
        auth = url.parse(kansorc.env.default.db).auth;
        if (!auth) {
          console.error('auth component not found in DB url');
          deferred.reject();
        } else {
          deferred.fulfill();
        }
      }
    } else {
      // might be running on travis - create a user

      // TODO check for existing user first
      var user = JSON.stringify({
        _id: 'org.couchdb.user:ci_test',
        name: 'CI Test User',
        type: 'user',
        roles: [ 'national_admin' ],
        password: 'pass'
      });

      var req = http.request({
        hostname: 'localhost',
        port: 5988,
        method: 'PUT',
        path: '/_users/org.couchdb.user:ci_test',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': user.length
        }
      }, function(res) {
        res.on('data', function(chunk) {});
        res.on('end', function() {
          auth = '_ci_test:pass';
          deferred.fulfill();
        });
      });
      req.on('error', function(e) {
        console.log('Request failed: ' + e.message);
        deferred.reject();
      });

      req.write(user);
      req.end();
    }

    return deferred.promise;
  }
};