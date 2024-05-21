/* eslint-disable no-console */
const _ = require('lodash/core');
const format = require('../modules/format');
const phoneNumber = require('@medic/phone-number');

angular.module('inboxServices').factory('Select2Search',
  function(
    $log,
    $q,
    $timeout,
    $translate,
    ContactMuted,
    LineageModelGenerator,
    Search,
    Session,
    Settings
  ) {

    'use strict';
    'ngInject';

    const defaultTemplateResult = function(row) {
      if (!row.doc) {
        return $('<span>' + (row.text || '&nbsp;') + '</span>');
      }
      // format escapes the content for us, and if we just return
      // a string select2 escapes it again, so return an element instead.
      return $(format.sender(row.doc, $translate));
    };

    const defaultTemplateSelection = function (selection) {
      if (Array.isArray(selection)) {
        return selection
          .map(function (row) {
            if (row.doc) {
              return (
                row.doc.name +
                (row.doc.muted
                  ? ' (' + $translate.instant('contact.muted') + ')'
                  : '')
              );
            }
            return row.text;
          })
          .join(', ');
      }
      if (selection.doc) {
        return (
          selection.doc.name +
          (selection.doc.muted
            ? ' (' + $translate.instant('contact.muted') + ')'
            : '')
        );
      }
      return selection.text;
    };

    const defaultSendMessageExtras = function(row) {
      return row;
    };

    return function(selectEl, _types, options) {

      options = options || {};
      let currentQuery;

      const pageSize = options.pageSize || 20;
      const allowNew = options.allowNew || false;
      const templateResult = options.templateResult || defaultTemplateResult;
      const templateSelection = options.templateSelection || defaultTemplateSelection;
      const sendMessageExtras = options.sendMessageExtras || defaultSendMessageExtras;
      const tags = options.tags || false;
      const initialValue = options.initialValue || selectEl.val();
      const types = Array.isArray(_types) ? _types : [ _types ];

      if (allowNew && types.length !== 1) {
        throw new Error('Unsupported options: cannot allowNew with ' + types.length + ' types');
      }
      const addNewText = $translate.instant('contact.type.' + types[0] + '.new');

      const prepareRows = function(documents) {
        return _.sortBy(documents, function(doc) {
          return doc.name;
        }).map(function(doc) {
          return {
            id: doc._id,
            doc: doc
          };
        });
      };

      const query = function(params, successCb, failureCb) {
        currentQuery = params.data.q;
        const skip = ((params.data.page || 1) - 1) * pageSize;
        const filters = {
          types: { selected: types },
          search: params.data.q
        };
        const options = {
          limit: pageSize,
          skip,
          hydrateContactNames: true,
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

      const getDoc = function(id) {
        return LineageModelGenerator.contact(id, { merge: true })
          .then(function(contact) {
            contact.doc.muted = ContactMuted(contact.doc);
            return contact.doc;
          })
          .catch(err => {
            if (err.code === 404) {
              $log.warn('Unable to hydrate select2 document', err);
              return undefined;
            }

            throw err;
          });
      };

      const resolveInitialValue = function(selectEl, initialValue) {
        if (initialValue) {
          if (Array.isArray(initialValue)) {
            console.log('Initial value is an array:', initialValue);
            initialValue.forEach(function (val) {
              if (!selectEl.children('option[value="' + val + '"]').length) {
                selectEl.append($('<option value="' + val + '"/>'));
              }
            });
          } else {
            console.log('Initial value is a single value:', initialValue);
            if (
              !selectEl.children('option[value="' + initialValue + '"]').length
            ) {
              selectEl.append($('<option value="' + initialValue + '"/>'));
            }
          }
          selectEl.val(initialValue);
        } else {
          selectEl.val('');
        }

        let resolution;
        const value = selectEl.val();
        if (!(value && value.length)) {
          resolution = $q.resolve();
        } else {
          if (Array.isArray(value)) {
            // NB: We now support an Array of IDs for places
            const docPromises = value.map(function (val) {
              return getDoc(val).then(function (doc) {
                return { id: val, doc: doc };
              });
            });

            resolution = $q
              .all(docPromises)
              .then(function(docs) {
                const select2Data = selectEl.select2('data') || [];
                docs.forEach(function (doc) {
                  const selected = select2Data.find((d) => d.id === doc.id);
                  if (selected) {
                    selected.doc = doc.doc;
                  } else {
                    select2Data.push({
                      id: doc.id,
                      doc: doc.doc,
                      text: doc.doc.name,
                    });
                  }
                });
              })
              .catch((err) => $log.error('Select2 failed to get documents', err));
          }
          if (phoneNumber.validate(Settings, value)) {
            // Raw phone number, don't resolve from DB
            const text = templateSelection({ text: value });
            selectEl.select2('data')[0].text = text;
            resolution = $q.resolve();
          } else {
            resolution = getDoc(value).then(function(doc) {
              selectEl.select2('data')[0].doc = doc;
            })
              .catch(err => $log.error('Select2 failed to get document', err));
          }
        }

        return resolution.then(function() {
          $timeout(() => {
            selectEl.trigger('change');
          }, 1000);
          return selectEl;
        });
      };

      const initSelect2 = function(selectEl) {
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
          const button = $('<a class="btn btn-link add-new"><i class="fa fa-plus"></i> ' + addNewText + '</a>')
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
            const docId = e.params &&
                        e.params.data &&
                        e.params.data.id;

            if (docId) {
              getDoc(docId).then(function(doc) {
                selectEl.select2('data')[0].doc = doc;
                selectEl.trigger('change');
              })
                .catch(err => $log.error('Select2 failed to get document', err));
            }
          });
        }
      };


      initSelect2(selectEl);
      return resolveInitialValue(selectEl, initialValue);
    };
  });
