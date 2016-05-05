var _ = require('underscore'),
    format = require('./format');

(function() {

  'use strict';

  exports.init = function($translate, Search, DB, $q) {
    var pageSize,
        allowNew,
        objectType;

    var formatResult = function(row) {
      if(!row.doc) {
        return $('<span>' + (row.text || '&nbsp;') + '</span>');
      }
      if(row.doc.type === 'person') {
        return $(format.contact(row.doc));
      }
      // format escapes the content for us, and if we just return
      // a string select2 escapes it again, so return an element instead.
      return $('<span>' + format.clinic(row.doc) + '</span>');
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
          text: $translate('contact.type.' + objectType + '.new'),
        });
      }

      return rows;
    };

    var currentQuery;

    var query = function(params, successCb, failureCb) {
      currentQuery = params.data.q;
      var skip = ((params.data.page || 1) - 1) * pageSize;
      var filters = {
        types: {
          selected: [objectType]
        },
        search: params.data.q
      };
      var options = {
        limit: pageSize,
        skip: skip
      };

      Search('contacts', filters, options, function(err, documents) {
        if (currentQuery !== params.data.q) {
          return;
        }

        if (err) {
          console.error(objectType + ' failed to load', err);
          return failureCb(err);
        }

        return successCb({
          results: prepareRows(documents, skip === 0),
          pagination: {
            more: documents.length === pageSize
          }
        });
      });
    };

    var resolveInitialValue = function(selectEl) {
      var value = selectEl.val();
      if (!value || value.length === 0) {
        return $q.resolve(selectEl);
      } else {
        return DB.get(value)
          .then(function(doc) {
            var text = formatSelection({doc: doc});
            selectEl.children('option[value='+value+']').text(text);
            return $q.resolve(selectEl);
          });
      }
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
      });
    };

    return function(selectEl, _objectType, options) {
      options = options || {};
      _.defaults(options, {
        pageSize: 20,
        allowNew: false,
        templateSelection: formatSelection,
        templateResult: formatResult
      });

      pageSize = options.pageSize;
      allowNew = options.allowNew;
      formatResult = options.templateResult;
      formatSelection = options.templateSelection;

      objectType = _objectType;

      return resolveInitialValue(selectEl)
      	.then(initSelect2)
      	.catch(function(err) {
      		console.log('Error initialising select2', err);
      	});
    };
  };
})();
