var _ = require('underscore');

(function () {

  'use strict';

  var getUsername = function() {
    var userCtx;
    document.cookie.split(';').forEach(function(c) {
      c = c.trim().split('=', 2);
      if (c[0] === 'userCtx') {
        userCtx = c[1];
      }
    });
    if (!userCtx) {
      return;
    }
    try {
      return JSON.parse(unescape(decodeURI(userCtx))).name;
    } catch(e) {
      return;
    }
  };

  var getDbNames = function() {
    // parse the URL to determine the remote and local database names
    var url = window.location.href;
    var protocolLocation = url.indexOf('//') + 2;
    var hostLocation = url.indexOf('/', protocolLocation) + 1;
    var dbNameLocation = url.indexOf('/', hostLocation);
    return {
      remoteUrl: url.slice(0, dbNameLocation),
      remoteDbName: url.slice(hostLocation, dbNameLocation),
      local: url.slice(hostLocation, dbNameLocation) + '-user-' + getUsername()
    };
  };

  module.exports = function(callback) {

    var names = getDbNames();

    window.PouchDB(names.local)
      .get('_design/medic')
      .then(function() {
        // ddoc found - bootstrap immediately
        callback();
      }).catch(function() {
        window.PouchDB(names.remoteUrl)
          .get('_design/medic')
          .then(function(ddoc) {
            var minimal = _.pick(ddoc, '_id', 'app_settings', 'views');
            minimal.remote_rev = ddoc._rev;
            return window.PouchDB(names.local)
              .put(minimal);
          })
          .then(callback)
          .catch(function(err) {
            if (err.status === 401) {
              console.warn('User must reauthenticate');
              window.location.href = '/' + names.remoteDbName + '/login' +
              '?redirect=' + encodeURIComponent(window.location.href);
            } else {
              $('.bootstrap-layer').html('<div><p>Loading error, please check your connection.</p><a class="btn btn-primary" href="#" onclick="window.location.reload(false);">Try again</a></div>');
              console.error('Error fetching ddoc from remote server', err);
            }
          });
      });

  };
}());