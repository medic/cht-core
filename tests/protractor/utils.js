var http = require('http'),
    url = require('url'),
    kansorc = require('../../.kansorc');

var getAuth = function() {
  var dbUrl = kansorc.env && kansorc.env.default && kansorc.env.default.db;
  if (!dbUrl) {
    throw new Error('.kansorc must have db url configured');
  }
  var auth = url.parse(kansorc.env.default.db).auth;
  if (!auth) {
    throw new Error('auth component not found in DB url');
  }
  return auth;
};

var request = function(options) {
  var deferred = protractor.promise.defer();

  var req = http.request({
    hostname: 'localhost',
    auth: getAuth(),
    port: 5988,
    path: options.path,
    method: options.method,
    headers: options.headers
  }, function(res) {
    res.setEncoding('utf8');
    var body = '';
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      deferred.fulfill(JSON.parse(body));
    });
  });
  req.on('error', function() {
    deferred.reject();
  });

  if (options.body) {
    req.write(options.body);
  }
  req.end();

  return deferred.promise;
};

module.exports = {

  saveDoc: function(doc) {
    var postData = JSON.stringify(doc);
    return request({
      path: '/medic',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      },
      body: postData
    });
  },

  getDoc: function(id) {
    return request({
      path: '/medic/' + id,
      method: 'GET'
    });
  },

  getAuditDoc: function(id) {
    return request({
      path: '/medic/_design/medic/_view/audit_records_by_doc?include_docs=true&key=["' + id + '"]',
      method: 'GET'
    });
  }

};