angular.module('inboxServices').factory('AddReadStatus',
  function(
    $q,
    DB
  ) {
    'use strict';
    'ngInject';

    var getKeys = function(type, models) {
      return models.map(function(model) {
        var id = model.id || model._id;
        return [ 'read', type, id ].join(':');
      });
    };

    var docExists = function(row) {
      return !!(row.value && !row.value.deleted);
    };

    var addRead = function(type, models) {
      if (!models.length) {
        return $q.resolve(models);
      }
      var keys = getKeys(type, models);
      return DB({ meta: true })
        .allDocs({ keys: keys })
        .then(function(response) {
          for (var i = 0; i < models.length; i++) {
            models[i].read = docExists(response.rows[i]);
          }
          return models;
        });
    };

    return {
      reports: function(models) {
        return addRead('report', models);
      },
      messages: function(models) {
        return addRead('message', models);
      }
    };
  }
);
