var session = require('session');

(function () {

  'use strict';

  exports.init = function(dbName) {
    var redirectToLogin = function() {
      window.location = '/' + dbName + '/login?redirect=' + encodeURIComponent(window.location);
    };
    $(document.body).on('click', '#logout', function(e) {
      e.preventDefault();
      session.logout(redirectToLogin);
    });
    var user = $('html').data('user');
    if (user && !user.name) {
      redirectToLogin();
    } else {
      if (user) {
        $.get('/_users/org.couchdb.user:' + user.name).fail(function(data) {
          if (data.status === 401) {
            // connected to the internet but unauthorized
            redirectToLogin();
          }
        });
      }
      session.on('change', function(userCtx) {
        if (!userCtx.name) {
          redirectToLogin();
        }
      });
    }
  };

}());