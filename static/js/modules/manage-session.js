var session = require('session');

(function () {

  'use strict';

  exports.init = function() {
    var redirectToLogin = function() {
      window.location = '/dashboard/_design/dashboard/_rewrite/login' +
        '?redirect=' + window.location;
    };
    $(document.body).on('click', '#logout', function(e) {
      e.preventDefault();
      session.logout(redirectToLogin);
    });
    if ($('html').data('user') && !$('html').data('user').name) {
      redirectToLogin();
    } else {
      session.on('change', function (userCtx) {
        if (!userCtx.name) {
          redirectToLogin();
        }
      });
    }
  };

}());