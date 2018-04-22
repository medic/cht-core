var _ = require('underscore');

angular.module('services').factory('XmlForms',
  function(
    $log,
    $parse,
    $q,
    Auth,
    Changes,
    ContactSchema,
    DB,
    UserContact,
    XmlFormsContextUtils
  ) {

    'use strict';
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

    var evaluateExpression = function(expression, doc, user, contactSummary) {
      var context = {
        contact: doc,
        user: user,
        summary: contactSummary
      };
      return $parse(expression)(XmlFormsContextUtils, context);
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
          return forms;
        });
    };

    var filter = function(form, options, user) {
      if (!options.includeCollect && form.context && form.context.collect) {
        return false;
      }

      if (options.contactForms !== undefined) {
        var isContactForm = form._id.indexOf('form:contact:') === 0;
        if (options.contactForms !== isContactForm) {
          return false;
        }
      }

      // Context filters
      if (options.ignoreContext) {
        return true;
      }
      if (!form.context) {
        // no defined filters
        return true;
      }

      if (options.doc) {
        var contactType = options.doc.type;
        if (contactType === 'person' && (
            (typeof form.context.person !== 'undefined' && !form.context.person) ||
            (typeof form.context.person === 'undefined' && form.context.place))) {
          return false;
        }
        if (ContactSchema.getPlaceTypes().indexOf(contactType) !== -1 && (
            (typeof form.context.place !== 'undefined' && !form.context.place) ||
            (typeof form.context.place === 'undefined' && form.context.person))) {
          return false;
        }
      }

      if (form.context.expression &&
          !evaluateExpression(form.context.expression, options.doc, user, options.contactSummary)) {
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
     *
     * @options (optional) Object for filtering. Possible values:
     *   - contactForms (boolean) : true will return only contact forms. False will exclude contact forms.
     *     Undefined will ignore this filter.
     *   - ignoreContext (boolean) : Each xml form has a context field, which helps specify in which cases
     * it should be shown or not shown.
     * E.g. `{person: false, place: true, expression: "!contact || contact.type === 'clinic'", permission: "can_edit_stuff"}`
     * Using ignoreContext = true will ignore that filter.
     *   - doc (Object) : when the context filter is on, the doc to pass to the forms context expression to
     *     determine if the form is applicable.
     * E.g. for context above, `{type: "district_hospital"}` passes,
     * but `{type: "district_hospital", contact: {type: "blah"} }` is filtered out.
     * See tests for more examples.
     *
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
              $log.error('Error fetching user contact', err);
            });
        })
        .catch(callback);
    };
  }
);
