var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('XmlForms',
    function(
      $log,
      $parse,
      $q,
      Auth,
      Changes,
      DB,
      PLACE_TYPES,
      UserContact,
      XmlFormsContextUtils
    ) {

      'ngInject';

      var listeners = {};

      var getForms = function() {
        return DB()
          .query('medic-client/forms', { include_docs: true })
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

      var evaluateExpression = function(expression, doc, user) {
        return $parse(expression)(XmlFormsContextUtils, { contact: doc, user: user });
      };

      var filterAll = function(forms, options, user) {
        // clone the forms list so we don't affect future filtering
        forms = forms.slice();
        var promises = _.map(forms, _.partial(filter, _, options, user));
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

      var filter = function(form, options, user) {
        if (options.contactForms !== undefined) {
          var isContactForm = form._id.indexOf('form:contact:') === 0;
          if (options.contactForms !== isContactForm) {
            return false;
          }
        }
        if (options.ignoreContext) {
          return true;
        }
        if (!form.context) {
          // no defined filters
          return true;
        }

        var contactType = options.doc && options.doc.type;
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

        if (form.context.expression &&
            !evaluateExpression(form.context.expression, options.doc, user)) {
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
              filterAll(forms, listener.options, user).then(function(results) {
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
          init = getForms();
          init
            .then(notifyAll)
            .catch(function(err) {
              _.values(listeners).forEach(function(listener) {
                listener.callback(err);
              });
            });
        }
      });

      /**
       * @name String to uniquely identify the callback to stop duplicate registration
       * @options (optional) Object for filtering. Possible values:
       *   - ignoreContext (boolean) to return all forms
       *   - contactForms (boolean) to return all contact forms, no contact forms,
       *     or both
       *   - doc (Object) the doc to pass to the forms context expression to
       *     determine if the form is applicable
       * @callback Invoked when complete and again when results have changed.
       */
      return function(name, options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        var listener = listeners[name] = {
          options: options,
          callback: callback
        };
        init
          .then(function(forms) {
            UserContact()
              .then(function(user) {
                return filterAll(forms, listener.options, user);
              })
              .then(function(results) {
                listener.callback(null, results);
              })
              .catch(function(err) {
                $log.error(err);
              });
          })
          .catch(callback);
      };
    }
  );

}());
