var _ = require('underscore'),
    format = require('../modules/format');

angular.module('inboxServices').factory('Select2Search',
  function(
    $q,
    $translate,
    DB,
    Search,
    Session
  ) {

    'use strict';
    'ngInject';

    var defaultTemplateResult = function(row) {
      if(!row.doc) {
        return $('<span>' + (row.text || '&nbsp;') + '</span>');
      }
      // format escapes the content for us, and if we just return
      // a string select2 escapes it again, so return an element instead.
      return $(format.contact(row.doc));
    };

    var defaultTemplateSelection = function(row) {
      if(row.doc) {
        return row.doc.name;
      }
      return row.text;
    };

    return function(selectEl, _types, options) {

      options = options || {};
      var currentQuery;

      var pageSize = options.pageSize || 20,
          allowNew = options.allowNew || false,
          templateResult = options.templateResult || defaultTemplateResult,
          templateSelection = options.templateSelection || defaultTemplateSelection,
          sendMessageExtras = options.sendMessageExtras || (function(i) {return i;}),
          tags = options.tags || false,
          initialValues = options.initialValues || [],
          types = Array.isArray(_types) ? _types : [ _types ];

      if (allowNew && types.length !== 1) {
        throw new Error('Unsupported options: cannot allowNew with ' + types.length + ' types');
      }
      var addNewText = $translate.instant('contact.type.' + types[0] + '.new');

      var prepareRows = function(documents) {
        return _.sortBy(documents, function(doc) {
          return doc.name;
        }).map(function(doc) {
          return {
            id: doc._id,
            doc: doc
          };
        });
      };

      var query = function(params, successCb, failureCb) {
        currentQuery = params.data.q;
        var skip = ((params.data.page || 1) - 1) * pageSize;
        var filters = {
          types: { selected: types },
          search: params.data.q
        };
        var options = {
          limit: pageSize,
          skip: skip
        };

        Search('contacts', filters, options)
          .then(function(documents) {
            if (currentQuery === params.data.q) {
              return successCb({
                results: sendMessageExtras(prepareRows(documents, skip === 0)),
                pagination: {
                  more: documents.length === pageSize
                }
              });
            }
          })
          .catch(function(err) {
            if (currentQuery === params.data.q) {
              failureCb(err);
            }
          });
      };

      var resolveInitialValue = function(selectEl, initialValues) {
        // TODO: add support for multiples values here
        initialValues = initialValues[0];

        if (initialValues && initialValues.length) {
          if (!selectEl.children('option[value="' + initialValues + '"]').length) {
            selectEl.append($('<option value="' + initialValues + '"/>'));
          }
          selectEl.val(initialValues);
        }

        var value = selectEl.val();
        if (!(value && value.length)) {
          return $q.resolve(selectEl);
        }
        // TODO: add support for multiples values here
        value = value[0];
        return DB().get(value)
          .then(function(doc) {
            var text = templateSelection({ doc: doc });
            // TODO: add support for multiples values here
            selectEl.select2('data')[0].doc = doc;
          })
          .catch(function() {
            var text = templateSelection({ text: value });
            // TODO: add support for multiples values here
            selectEl.select2('data')[0].text = text;
          }).then(function() {
            selectEl.trigger('change');
            return selectEl
          });
      };

      var initSelect2 = function(selectEl) {
        selectEl.select2({
          ajax: {
            delay: 500,
            transport: query
          },
          allowClear: true,
          placeholder: '',
          tags: tags,
          templateResult: templateResult,
          templateSelection: templateSelection,
          width: '100%',
          minimumInputLength: Session.isAdmin() ? 3 : 0
        });
        if (allowNew) {
          var button = $('<a class="btn btn-link add-new"><i class="fa fa-plus"></i> ' + addNewText + '</a>')
            .on('click', function() {
              selectEl.append($('<option value="NEW" selected="selected">' + addNewText + '</option>'));
              selectEl.trigger('change');
            });
          selectEl.after(button);
        }
      };

      initSelect2(selectEl);
      return resolveInitialValue(selectEl, initialValues);
    };
  }
);
