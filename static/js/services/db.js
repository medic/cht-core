// TODO delete me?
(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('DB', [
    'pouchDB',
    function(pouchDB) {
      return function() {
        return pouchDB('medic');
      };
    }
  ]);

}());
