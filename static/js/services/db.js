var utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DB', [
    'pouchDB', 'Session', 'DbNameService',
    function(pouchDB, Session, DbNameService) {

      var cache = {};

      var getRemoteUrl = function(name) {
        name = name || DbNameService();
        var port = location.port ? ':' + location.port : '';
        return location.protocol + '//' + location.hostname + port + '/' + name;
      };

      return {
        get: function(name) {
          if (utils.isUserAdmin(Session.userCtx())) {
            name = getRemoteUrl(name);
          }
          name = name || DbNameService();
          if (!cache[name]) {
            cache[name] = pouchDB(name);
          }
          return cache[name];
        },
        getRemote: function(name) {
          return pouchDB(getRemoteUrl(name));
        },
        getRemoteUrl: getRemoteUrl
      };
    }
  ]);

}());