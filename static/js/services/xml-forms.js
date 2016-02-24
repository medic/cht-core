var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('XmlForms', [
    '$q', 'DB', 'Changes',
    function($q, DB, Changes) {

      var listeners = {};

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

      var filter = function(forms, context) {
        return _.filter(forms, function(form) {
          if (context && context.contact && context.contact.type === 'person') {
            return form.context.person;
          }
          return true;
        });
      };

      var notify = function(forms, listener) {
        listener.callback(null, filter(forms, listener.context));
      };

      Changes({
        key: 'xml-forms',
        filter: function(change) {
          return change.id.indexOf('form:') === 0;
        },
        callback: function() {
          getForms()
            .then(function(forms) {
              _.values(listeners).forEach(function(listener) {
                notify(forms, listener);
              });
            })
            .catch(function(err) {
              _.values(listeners).forEach(function(listener) {
                listener.callback(err);
              });
            });
        }
      });

      return function(name, context, callback) {
        if (!callback) {
          callback = context;
          context = null;
        }
        listeners[name] = {
          context: context,
          callback: callback
        };
        init
          .then(function(forms) {
            notify(forms, listeners[name]);
          })
          .catch(callback);
      };
    }
  ]);

}());

            // $scope.relevantForms = _.filter($scope.formDefinitions, function(form) {
            //   if (!form.context) {
            //     return false;
            //   }
            //   if (typeof form.context === 'string') {
            //     return $parse(form.context)
            //         .call(null, CONTEXT_UTILS, { contact: $scope.selected.doc });
            //   }
            //   if ($scope.selected.doc.type === 'person') {
            //     return form.context.person;
            //   }
            //   return form.context.place;
            // });

            
/**
 * Util functions available to a form doc's `.context` function for checking if
 * a form is relevant to a specific contact.
 */
// var CONTEXT_UTILS = {
//   ageInYears: function(c) {
//     if (!c.date_of_birth) {
//       return;
//     }
//     var birthday = new Date(c.date_of_birth),
//         today = new Date();
//     return (today.getFullYear() - birthday.getFullYear()) +
//         (today.getMonth() < birthday.getMonth() ? -1 : 0) +
//         (today.getMonth() === birthday.getMonth() &&
//             today.getDate() < birthday.getDate() ? -1 : 0);
//   },
// };