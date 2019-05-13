angular.module('inboxServices').factory('XmlForms',
  function(
    $parse,
    $q,
    Auth,
    Changes,
    ContactTypes,
    DB,
    UserContact,
    XmlFormsContextUtils
  ) {

    'use strict';
    'ngInject';

    const listeners = {};

    const findXFormAttachmentName = doc => {
      return doc &&
             doc._attachments &&
             Object.keys(doc._attachments).find(name => name === 'xml' || name.endsWith('.xml'));
    };

    const getForms = function() {
      const options = {
        include_docs: true,
        key: ['form']
      };
      return DB()
        .query('medic-client/doc_by_type', options)
        .then(function(res) {
          return res.rows
            .filter(row => findXFormAttachmentName(row.doc))
            .map(row => row.doc);
        });
    };
    
    let init = getForms();

    const getById = internalId => {
      const formId = `form:${internalId}`;
      return DB().get(formId);
    };

    const getByView = internalId => {
      return init
        .then(docs => docs.filter(doc => doc.internalId === internalId))
        .then(docs => {
          if (!docs.length) {
            return $q.reject(new Error(`No form found for internalId "${internalId}"`));
          }
          if (docs.length > 1) {
            return $q.reject(new Error(`Multiple forms found for internalId: "${internalId}"`));
          }
          return docs[0];
        });
    };

    const evaluateExpression = function(expression, doc, user, contactSummary) {
      const context = {
        contact: doc,
        user: user,
        summary: contactSummary
      };
      return $parse(expression)(XmlFormsContextUtils, context);
    };

    const filterAll = function(forms, options) {
      return UserContact().then(user => {
        // clone the forms list so we don't affect future filtering
        forms = forms.slice();
        const promises = forms.map(form => filter(form, options, user));
        return $q.all(promises)
          .then(function(resolutions) {
            // always splice in reverse...
            for (let i = resolutions.length - 1; i >= 0; i--) {
              if (!resolutions[i]) {
                forms.splice(i, 1);
              }
            }
            return forms;
          });
      });
    };

    const filter = function(form, options, user) {
      if (!options.includeCollect && form.context && form.context.collect) {
        return false;
      }

      if (options.contactForms !== undefined) {
        const isContactForm = form._id.indexOf('form:contact:') === 0;
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
        const contactType = options.doc.type;
        if (contactType === 'person' && (
            (typeof form.context.person !== 'undefined' && !form.context.person) ||
            (typeof form.context.person === 'undefined' && form.context.place))) {
          return false;
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
    };

    const notifyAll = function(forms) {
      return UserContact().then(function(user) {
        Object.keys(listeners).forEach(key => {
          const listener = listeners[key];
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
            Object.keys(listeners).forEach(key => {
              listeners[key].callback(err);
            });
          });
      }
    });

    return {

      /**
       * Returns a doc containing an xform with the given internal identifier if the user is allowed to see it.
       *
       * @param The value of the desired doc's internalId field.
       */
      get: internalId => {
        return getById(internalId)
          .catch(err => {
            if (err.status === 404) {
              // fallback for backwards compatibility
              return getByView(internalId);
            }
            throw err;
          })
          .then(doc => {
            if (!findXFormAttachmentName(doc)) {
              return $q.reject(new Error(`The form "${internalId}" doesn't have an xform attachment`));
            }
            return doc;
          });
      },

      /**
       * Returns the name of the xform attachment.
       *
       * @param The document find the xform attachment for
       */
      findXFormAttachmentName: findXFormAttachmentName,

      /**
       * Returns a Promise which resolves an array of docs which contain an
       * xform the user is allow to complete.
       *
       * @params options Described in the "listen" function below.
       */
      list: function(options) {
        return init.then(forms => filterAll(forms, options || {}));
      },

      /**
       * Invokes the given callback with an array of docs containing xforms
       * which the user is allowed to complete. Listens for changes and invokes
       * the callback again when needed.
       *
       * @param name String to uniquely identify the callback to stop duplicate registration
       *
       * @param options (optional) Object for filtering. Possible values:
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
       * @param callback Invoked when complete and again when results have changed.
       */
      listen: function(name, options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        const listener = listeners[name] = {
          options: options || {},
          callback: callback
        };
        init
          .then(forms => filterAll(forms, listener.options))
          .then(results => listener.callback(null, results))
          .catch(callback);
      }
    };
  }
);
