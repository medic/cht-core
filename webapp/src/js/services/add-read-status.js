/**
 * @memberof inboxServices
 * @ngdoc service
 * @name AddReadStatus
 * @description Updates the given view models with a boolean `read` property
 */
angular.module('inboxServices').factory('AddReadStatus',
  function(
    $q,
    DB
  ) {
    'use strict';
    'ngInject';

    const getKeys = function(type, models) {
      return models.map(function(model) {
        const id = model.id || model._id;
        return [ 'read', type, id ].join(':');
      });
    };

    const docExists = function(row) {
      return !!(row.value && !row.value.deleted);
    };

    const addRead = function(type, models) {
      if (!models.length) {
        return $q.resolve(models);
      }
      const keys = getKeys(type, models);
      return DB({ meta: true })
        .allDocs({ keys: keys })
        .then(function(response) {
          for (let i = 0; i < models.length; i++) {
            models[i].read = docExists(response.rows[i]);
          }
          return models;
        });
    };

    return {
      /**
       * Update report view models 
       * @memberof AddReadStatus
       * @param {Object[]} models The models to mark as read
       * @returns {Promise} A promise to return updated models
       */
      reports: function(models) {
        return addRead('report', models);
      },
      /**
       * Update message view models
       * @memberof AddReadStatus
       * @param {Object[]} models The models to mark as read
       * @returns {Promise} A Promise to return updated models
       */
      messages: function(models) {
        return addRead('message', models);
      }
    };
  }
);
