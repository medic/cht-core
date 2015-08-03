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

      // TODO lock down api so non-admins can only replicate
      // TODO stop users from creating docs against another facility - update validation on replicate?
      // TODO only admins can replicate _users! Find another way to get current user information
      // TODO user context is actually cached in the dom in appcache. listen to change and invalidate appcacahe?
      // pouchDB('_users')
      //   .replicate.from('http://localhost:5988/_users', replicationOptions);

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
