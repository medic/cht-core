var utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DB', [
    'pouchDB', 'UserCtxService', 'DbNameService',
    function(pouchDB, UserCtxService, DbNameService) {

      var getRemoteUrl = function(name) {
        name = name || DbNameService();
        var port = location.port ? ':' + location.port : '';
        return location.protocol + '//' + location.hostname + port + '/' + name;
      };

      return {
        get: function(name) {
          if (utils.isUserAdmin(UserCtxService())) {
            name = getRemoteUrl(name);
          }
          return pouchDB(name || DbNameService());
        },
        getRemote: function(name) {
          return pouchDB(getRemoteUrl(name));
        },
        getRemoteUrl: getRemoteUrl
      };
    }
  ]);

}());
