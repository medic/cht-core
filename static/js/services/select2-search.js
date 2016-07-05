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

    var pageSize,
        allowNew,
        types,
        currentQuery;

    var formatResult = function(row) {
      if(!row.doc) {
        return $('<span>' + (row.text || '&nbsp;') + '</span>');
      }
      // format escapes the content for us, and if we just return
      // a string select2 escapes it again, so return an element instead.
      return $(format.contact(row.doc));
    };

    var formatSelection = function(row) {
      if(row.doc) {
        return row.doc.name;
      }
      return row.text;
    };

    var prepareRows = function(documents, first) {
      var rows = _.sortBy(documents, function(doc) {
        return doc.name;
      }).map(function(doc) {
        return {
          id: doc._id,
          doc: doc
        };
      });

      if (first && allowNew) {
        rows.unshift({
          id: 'NEW',
          text: $translate.instant('contact.type.' + types[0] + '.new'),
        });
      }

      return rows;
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
              results: prepareRows(documents, skip === 0),
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

    var resolveInitialValue = function(selectEl) {
      var value = selectEl.val();
      if (!value || value.length === 0) {
        return $q.resolve(selectEl);
      }
      return DB().get(value)
        .then(function(doc) {
          var text = formatSelection({ doc: doc });
          selectEl.children('option[value=' + value + ']').text(text);
          return selectEl;
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
        templateResult: formatResult,
        templateSelection: formatSelection,
        width: '100%',
        minimumInputLength: Session.isAdmin() ? 3 : 0
      });
    };

    return function(selectEl, _types, options) {
      options = options || {};
      pageSize = options.pageSize || 20;
      allowNew = options.allowNew || false;
      formatResult = options.templateResult || formatResult;
      formatSelection = options.templateSelection || formatSelection;
      types = Array.isArray(_types) ? _types : [ _types ];
      if (allowNew && types.length !== 1) {
        throw new Error('Unsupported options: cannot allowNew with ' + types.length + ' types');
      }
      return resolveInitialValue(selectEl).then(initSelect2);
    };
  }
);
