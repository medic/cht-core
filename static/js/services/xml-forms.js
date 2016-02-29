var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  /**
   * Util functions available to a form doc's `.context` function for checking if
   * a form is relevant to a specific contact.
   */
  var CONTEXT_UTILS = {
    ageInYears: function(c) {
      if (!c.date_of_birth) {
        return;
      }
      var birthday = new Date(c.date_of_birth),
          today = new Date();
      return (today.getFullYear() - birthday.getFullYear()) +
          (today.getMonth() < birthday.getMonth() ? -1 : 0) +
          (today.getMonth() === birthday.getMonth() &&
              today.getDate() < birthday.getDate() ? -1 : 0);
    },
  };

  inboxServices.factory('XmlForms', [
    '$q', '$parse', '$log', 'DB', 'Changes', 'Auth', 'UserContact', 'PLACE_TYPES',
    function($q, $parse, $log, DB, Changes, Auth, UserContact, PLACE_TYPES) {

      var listeners = {};

      var getForms = function() {
        return DB.get()
          .query('medic/forms', { include_docs: true })
          .then(function(res) {
            return res.rows
              .filter(function(row) {
                return row.doc._attachments.xml;
              })
              .map(function(row) {
                return row.doc;
              });
          });
      };

      var init = getForms();

      var evaluateExpression = function(expression, context, user) {
        return $parse(expression)(CONTEXT_UTILS, { contact: context.doc, user: user });
      };

      var filterAll = function(forms, context, user) {
        // clone the forms list so we don't affect future filtering
        forms = forms.slice();
        var promises = _.map(forms, _.partial(filter, _, context, user));
        return $q.all(promises)
          .then(function(resolutions) {
            // always splice in reverse...
            for (var i = resolutions.length - 1; i >= 0; i--) {
              if (!resolutions[i]) {
                forms.splice(i, 1);
              }
            }
            return $q.resolve(forms);
          });
      };

      var filter = function(form, context, user) {
        if (!context && !form.context) {
          // no provided context therefore don't filter anything out
          return true;
        }
        if (context.contactForms !== undefined) {
          var isContactForm = form._id.indexOf('form:contact:') === 0;
          if (context.contactForms !== isContactForm) {
            return false;
          }
        }
        if (!form.context) {
          // no defined filters
          return true;
        }
        var contactType = context.doc && context.doc.type;
        if (contactType === 'person' && (
            (typeof form.context.person !== 'undefined' && !form.context.person) ||
            (typeof form.context.person === 'undefined' && form.context.place))) {
          return false;
        }
        if (PLACE_TYPES.indexOf(contactType) !== -1 && (
            (typeof form.context.place !== 'undefined' && !form.context.place) ||
            (typeof form.context.place === 'undefined' && form.context.person))) {
          return false;
        }

        if (form.context.expression && !evaluateExpression(form.context.expression, context, user)) {
          return false;
        }
        if (!form.context.permission) {
          return true;
        }
        return Auth(form.context.permission)
          .then(function() {
            return true;
          })
          .catch(function() {
            return false;
          });
      };

      var notifyAll = function(forms) {
        return UserContact()
          .then(function(user) {
            _.values(listeners).forEach(function(listener) {
              filterAll(forms, listener.context, user).then(function(results) {
                listener.callback(null, results);
              });
            });
          });
      };

      Changes({
        key: 'xml-forms',
        filter: function(change) {
          return change.id.indexOf('form:') === 0;
        },
        callback: function() {
          getForms()
            .then(notifyAll)
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
          context = {};
        }
        listeners[name] = {
          context: context,
          callback: callback
        };
        var listener = listeners[name];
        init
          .then(function(forms) {
            UserContact()
              .then(function(user) {
                return filterAll(forms, listener.context, user);
              })
              .then(function(results) {
                listener.callback(null, results);
              });
          })
          .catch(callback);
      };
    }
  ]);

}());
