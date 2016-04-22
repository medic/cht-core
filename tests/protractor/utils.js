var http = require('http'),
    auth = require('./auth'),
    DBNAME = 'medic-test';

var originalSettings;

var request = function(options) {
  var deferred = protractor.promise.defer();

  options.hostname = 'localhost';
  options.port = 5998;
  options.auth = auth.getAuthString();

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var body = '';
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      try {
        deferred.fulfill(JSON.parse(body));
      } catch(e) {
        console.log('Error parsing response: ' + body);
        deferred.reject();
      }
    });
  });
  req.on('error', function(e) {
    console.log('Request failed: ' + e.message);
    deferred.reject();
  });

  if (options.body) {
    req.write(options.body);
  }
  req.end();

  return deferred.promise;
};

module.exports = {

  request: request,

  saveDoc: function(doc) {
    var postData = JSON.stringify(doc);
    return request({
      path: '/' + DBNAME,
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
      path: '/' + DBNAME + '/' + id,
      method: 'GET'
    });
  },

  getAuditDoc: function(id) {
    return request({
      path: '/' + DBNAME + '-audit/_design/medic/_view/audit_records_by_doc?include_docs=true&key=["' + id + '"]',
      method: 'GET'
    });
  },

  deleteDoc: function(id) {
    return module.exports.getDoc(id)
      .then(function(doc) {
        doc._deleted = true;
        return module.exports.saveDoc(doc);
      });
  },

  updateSettings: function(updates) {
    if (originalSettings) {
      throw new Error('A previous test did not call revertSettings');
    }
    return request({
      path: '/' + DBNAME + '/_design/medic/_rewrite/app_settings/medic',
      method: 'GET'
    }).then(function(settings) {
      originalSettings = settings;
      return request({
        path: '/' + DBNAME + '/_design/medic/_rewrite/update_settings/medic',
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    });
  },

  revertSettings: function() {
    if (!originalSettings) {
      throw new Error('No original settings to revert to');
    }
    return request({
      path: '/' + DBNAME + '/_design/medic/_rewrite/update_settings/medic',
      method: 'PUT',
      body: JSON.stringify(originalSettings)
    }).then(function() {
      originalSettings = null;
    });
  }

};