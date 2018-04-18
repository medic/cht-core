angular.module('services').factory('DB',
  function(
    pouchDB
  ) {

    'use strict';
    'ngInject';

    // TODO fix name
    var db = pouchDB('http://localhost:5988/medic', { skip_setup: true, ajax: { timeout: 30000 }});

    return function() {
      return db;
    };
  }
);
