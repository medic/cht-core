const _ = require('underscore');

angular.module('inboxServices').service('ContactForm',
  function(
    ContactSchema,
    EnketoTranslation,
    Repository
  ) {

    'use strict';
    'ngInject';

    const withAvailableForms = Repository.forms().then(function(res) {
      return _.pluck(res, 'id');
    });

    const getFormById = function(availableForms, id) {
      /* something is wrong here */
      if (_.contains(availableForms, id)) {
        return { id };
      }
    };

    const generateForm = function(type, extras) {
      const schema = ContactSchema.get(type);
      const xml = EnketoTranslation.generateXform(schema, extras);
      return { xml };
    };

    const getFormFor = function(type, mode, extras) {
      return withAvailableForms.then(function(availableForms) {
        return getFormById(availableForms, 'form:contact:' + type + ':' + mode) ||
               getFormById(availableForms, 'form:contact:' + type) ||
               generateForm(type, extras);
      });
    };

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
