var _ = require('underscore');

(function () {

  'use strict';

  angular.module('inboxServices').service('ContactForm',
    function(
      $q,
      ContactSchema,
      DB,
      EnketoTranslation,
      FileReader
    ) {

      var withAvailableForms = DB().query('medic-client/forms')
        .then(function(res) {
          return _.pluck(res.rows, 'id');
        });

      function getXmlAttachment(doc) {
        return DB().getAttachment(doc._id, 'xml')
          .then(FileReader);
      }

      function getFormById(availableForms, id) {
        if (_.contains(availableForms, id)) {
          return DB().get(id)
            .then(getXmlAttachment);
        }
      }

      function getFormFor(type, mode, extras) {
        return withAvailableForms
          .then(function(availableForms) {
            return getFormById(availableForms, 'form:contact:' + type + ':' + mode) ||
              getFormById(availableForms, 'form:contact:' + type) ||
              $q.resolve(
                EnketoTranslation.generateXform(ContactSchema.get(type), extras));
          });
      }

      return {
        forCreate: function(type, extras) {
          return getFormFor(type, 'create', extras);
        },
        forEdit: function(type, extras) {
          return getFormFor(type, 'edit', extras);
        }
      };
    }
  );
}());
