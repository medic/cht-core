var _ = require('underscore'),
    http = require('http'),
    environment = require('./auth')(),
    path = require('path');

var originalSettings = {};

// The app_settings and update_settings modules are on the main ddoc.
var mainDdocName = 'medic';

var request = function(options, debug) {
  var deferred = protractor.promise.defer();

  options.hostname = environment.apiHost;
  options.port = environment.apiPort;
  options.auth = environment.user + ':' + environment.pass;

  if (debug) {
    console.log('REQUEST');
    console.log(JSON.stringify(options));
  }

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    var body = '';
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      try {
        body = JSON.parse(body);
        if (body.error) {
          deferred.reject(new Error('Request failed: ' + options.path + ',\n  body: ' + JSON.stringify(options.body) + '\n  response: ' + JSON.stringify(body)));
        } else {
          deferred.fulfill(body);
        }
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

var updateSettingsForDdoc = function(updates, ddocName) {
    if (originalSettings[ddocName]) {
      throw new Error('A previous test did not call revertSettings on ' + ddocName);
    }
    return request({
      path: path.join('/', environment.dbName, '_design', mainDdocName, '_rewrite/app_settings', ddocName),
      method: 'GET'
    }).then(function(result) {
      originalSettings[ddocName] = result.settings;

      // Make sure all updated fields are present in originalSettings[ddocName], to enable reverting later.
      Object.keys(updates).forEach(function(updatedField) {
        if (!_.has(originalSettings[ddocName], updatedField)) {
          originalSettings[ddocName][updatedField] = null;
        }
      });
      return;
    }).then(function() {
      return request({
        path: path.join('/', environment.dbName, '_design', mainDdocName, '_rewrite/update_settings', ddocName, '?replace=1'),
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    });
  };

var revertSettingsForDdoc = function(ddocName) {
    if (!originalSettings[ddocName]) {
      throw new Error('No original settings to revert to for ' + ddocName);
    }

    return request({
      path: path.join('/', environment.dbName, '_design', mainDdocName, '_rewrite/update_settings', ddocName, '?replace=1'),
      method: 'PUT',
      body: JSON.stringify(originalSettings[ddocName])
    }).then(function() {
      delete originalSettings[ddocName];
    });
  };


module.exports = {

  request: request,

  requestOnTestDb: function(options, debug) {
    options.path = '/' + environment.dbName + options.path;
    return request(options, debug);
  },

  saveDoc: function(doc) {
    var postData = JSON.stringify(doc);
    return request({
      path: '/' + environment.dbName,
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
      path: '/' + environment.dbName + '/' + id,
      method: 'GET'
    });
  },

  getAuditDoc: function(id) {
    return request({
      path: '/' + environment.dbName + '-audit/' + id + '-audit',
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
    // Update both ddocs, to avoid instability in tests.
    // Note that API will be copying changes to medic over to medic-client, so change
    // medic-client first (api does nothing) and medic after (api copies changes over to
    // medic-client, but the changes are already there.)
    return updateSettingsForDdoc(updates, 'medic-client')
      .then(function() {
        return updateSettingsForDdoc(updates, 'medic');
      });
  },

  revertSettings: function() {
    return revertSettingsForDdoc('medic-client')
      .then(function() {
        return revertSettingsForDdoc('medic');
      });
  },

  resetBrowser: function() {
    browser.driver.navigate().refresh().then(function() {
      return browser.wait(function() {
        return browser.isElementPresent(by.css('#message-list'));
      }, 10000);
    });
  },

  countOf: function(count) {
    return function(c) {
      return c === count;
    };
  }
};
