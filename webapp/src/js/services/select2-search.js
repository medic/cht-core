var _ = require('underscore'),
    format = require('../modules/format'),
    phoneNumber = require('phone-number');

angular.module('inboxServices').factory('Select2Search',
  function(
    $log,
    $q,
    $translate,
    DB,
    ContactMuted,
    LineageModelGenerator,
    Search,
    Session,
    Settings
  ) {

    'use strict';
    'ngInject';

    var defaultTemplateResult = function(row) {
      if(!row.doc) {
        return $('<span>' + (row.text || '&nbsp;') + '</span>');
      }
      // format escapes the content for us, and if we just return
      // a string select2 escapes it again, so return an element instead.
      return $(format.sender(row.doc, $translate));
    };

    var defaultTemplateSelection = function(row) {
      if(row.doc) {
        return row.doc.name + (row.doc.muted ? ' (' + $translate.instant('contact.muted') + ')': '');
      }
      return row.text;
    };

    var defaultSendMessageExtras = function(row) {
      return row;
    };

    return function(selectEl, _types, options) {

      options = options || {};
      var currentQuery;

      var pageSize = options.pageSize || 20,
          allowNew = options.allowNew || false,
          templateResult = options.templateResult || defaultTemplateResult,
          templateSelection = options.templateSelection || defaultTemplateSelection,
          sendMessageExtras = options.sendMessageExtras || defaultSendMessageExtras,
          tags = options.tags || false,
          initialValue = options.initialValue || selectEl.val(),
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
              successCb({
                results: sendMessageExtras(prepareRows(documents)),
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

      var getDoc = function(id) {
        return LineageModelGenerator.contact(id, { merge: true })
          .then(function(contact) {
            return contact && contact.doc;
          })
          .then(function(doc) {
            doc.muted = ContactMuted(doc);
            return doc;
          });
      };

      var resolveInitialValue = function(selectEl, initialValue) {
        if (initialValue) {
          if (!selectEl.children('option[value="' + initialValue + '"]').length) {
            selectEl.append($('<option value="' + initialValue + '"/>'));
          }
          selectEl.val(initialValue);
        } else {
          selectEl.val('');
        }

        var resolution;
        var value = selectEl.val();
        if (!(value && value.length)) {
          resolution = $q.resolve();
        } else {
          if (Array.isArray(value)) {
            // NB: For now we only support resolving one initial value
            // multiple is not an existing use case for us
            value = value[0];
          }
          if (phoneNumber.validate(Settings, value)) {
            // Raw phone number, don't resolve from DB
            var text = templateSelection({ text: value });
            selectEl.select2('data')[0].text = text;
            resolution = $q.resolve();
          } else {
            resolution = getDoc(value).then(function(doc) {
              selectEl.select2('data')[0].doc = doc;
            });
          }
        }

        return resolution.then(function() {
          selectEl.trigger('change');
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
          tags: tags,
          templateResult: templateResult,
          templateSelection: templateSelection,
          width: '100%',
          minimumInputLength: Session.isOnlineOnly() ? 3 : 0
        });
        if (allowNew) {
          var button = $('<a class="btn btn-link add-new"><i class="fa fa-plus"></i> ' + addNewText + '</a>')
            .on('click', function() {
              selectEl.append($('<option value="NEW" selected="selected">' + addNewText + '</option>'));
              selectEl.trigger('change');
            });
          selectEl.after(button);
        }

        // Hydrate and re-set real doc on change
        // !tags -> only support single values, until there is a use-case
        if (!tags) {
          selectEl.on('select2:select', function(e) {
            var docId = e.params &&
                        e.params.data &&
                        e.params.data.id;

            if (docId) {
              getDoc(docId)
                .then(function(doc) {
                  selectEl.select2('data')[0].doc = doc;
                  selectEl.trigger('change');
                })
                .catch(function(err) {
                  $log.error('Unable to hydrate select2 selection', err);
                });
            }
          });
        }
      };


      initSelect2(selectEl);
      return resolveInitialValue(selectEl, initialValue);
    };
  }
);
