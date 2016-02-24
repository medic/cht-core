var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('XmlForms', [
    '$q', 'DB', 'Changes',
    function($q, DB, Changes) {

      var callbacks = {};

      var getForms = function() {
        return DB.get()
          .query('medic/forms', { include_docs: true })
          .then(function(res) {
            var forms = res.rows
              .filter(function(row) {
                return row.doc._attachments.xml;
              })
              .map(function(row) {
                return row.doc;
              });
            return $q.resolve(forms);
          });
      };

      var init = getForms();

      Changes({
        key: 'xml-forms',
        filter: function(change) {
          return change.id.indexOf('form:') === 0;
        },
        callback: function() {
          getForms()
            .then(function(forms) {
              _.values(callbacks).forEach(function(callback) {
                callback(null, forms);
              });
            })
            .catch(function(err) {
              _.values(callbacks).forEach(function(callback) {
                callback(err);
              });
            });
        }
      });

      return function(name, callback) {
        callbacks[name] = callback;
        init
          .then(function(forms) {
            callback(null, forms);
          })
          .catch(callback);
      };
    }
  ]);

}());