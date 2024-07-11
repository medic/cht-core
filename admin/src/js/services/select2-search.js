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
    DB,
    LineageModelGenerator,
    Search,
    Session,
    Settings
  ) { //NoSONAR

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

    const defaultTemplateSelection = (selection) => {
      const formatRow = (row) => {
        if (!row.doc) {
          return row.text;
        }

        let formatted = row.doc.name;
        if (row.doc.muted) {
          formatted += `(${$translate.instant('contact.muted')})`;
        }
        return formatted;
      };
      if (Array.isArray(selection)) {
        return selection.map((row) => formatRow(row)).join(', ');
      }
      return formatRow(selection);
    };

    const defaultSendMessageExtras = function(row) {
      return row;
    };

    return function(selectEl, _types, options) { //NoSONAR

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

      const addValue = (val) => {
        if (!selectEl.children('option[value="' + val + '"]').length) {
          selectEl.append($('<option value="' + val + '"/>'));
        }
      };

      const getDocs = function (ids) {

        return DB()
          .allDocs({ keys: ids, include_docs: true })
          .then((docs) => processDocs(docs));
      };

      const processDocs = function(result) {
        const docIds = result.rows.map((row) => row.doc._id);
        return hydrateDocs(docIds);
      };

      const hydrateDocs = function(docIds) {
        return $q
          .all(docIds.map(id => LineageModelGenerator.contact(id, { merge: true })))
          .then(muteContacts);
      };

      const muteContacts = function (contacts) {
        contacts.forEach((contact) => {
          contact.doc.muted = ContactMuted(contact.doc);
        });

        return contacts.map((doc) => ({
          id: doc._id,
          doc: doc.doc,
        }));
      };

      const populateSelectWithDocs = function (selectEl, docs) {
        docs.forEach((doc) => {
          updateSelect2DataWithDoc(selectEl, doc.id, doc.doc);
        });
      };

      const resolveInitialValue = function(selectEl, initialValue) { //NoSONAR
        if (initialValue) {
          if (Array.isArray(initialValue)) {
            initialValue.forEach((val) => addValue(val));
          } else {
            addValue(initialValue);
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
            resolution = getDocs(value) //NoSONAR
              .then(docs => populateSelectWithDocs(selectEl, docs))
              .catch(err => $log.error('Select2 failed to get documents', err));
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

        return resolution.then(function() { //NoSONAR
          $timeout(() => { //NoSONAR
            selectEl.trigger('change');
          });
          return selectEl;
        });
      };

      const updateSelect2DataWithDoc = function (selectEl, docId, doc) {
        const select2Data = selectEl.select2('data') || [];
        const selected = select2Data.find((d) => d.id === docId);
        if (selected) {
          selected.doc = doc;
        } else {
          select2Data.push({
            id: docId,
            doc: doc,
            text: doc.name,
          });
        }
        selectEl.select2('data', select2Data);
        $timeout(() => { //NoSONAR
          selectEl.trigger('change');
        });
      };

      const updateDocument = function (selectEl, docId) {
        return getDoc(docId)
          .then((doc) => {
            updateSelect2DataWithDoc(selectEl, docId, doc);
            return selectEl;
          })
          .catch((err) => {
            $log.error('Select2 failed to get document', err);
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

              return selectEl;
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
              updateDocument(selectEl, docId);
            }
          });
        }
      };

      initSelect2(selectEl);
      return resolveInitialValue(selectEl, initialValue);
    };
  });
