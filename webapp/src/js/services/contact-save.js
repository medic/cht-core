const _ = require('lodash');
const uuidV4 = require('uuid/v4');

angular.module('inboxServices').service('ContactSave',
  function(
    $ngRedux,
    $q,
    ContactTypes,
    DB,
    EnketoTranslation,
    ExtractLineage,
    ServicesActions
  ) {

    'use strict';
    'ngInject';

    const CONTACT_FIELD_NAMES = [ 'parent', 'contact' ];

    const self = this;
    const mapDispatchToTarget = (dispatch) => {
      const servicesActions = ServicesActions(dispatch);
      return {
        setLastChangedDoc: servicesActions.setLastChangedDoc
      };
    };
    $ngRedux.connect(null, mapDispatchToTarget)(self);

    function generateFailureMessage(bulkDocsResult) {
      return _.reduce(bulkDocsResult, function(msg, result) {
        let newMsg = msg;
        if (!result.ok) {
          if (!newMsg) {
            newMsg = 'Some documents did not save correctly: ';
          }
          newMsg += result.id + ' with ' + result.message + '; ';
        }
        return newMsg;
      }, null);
    }

    const prepareSubmittedDocsForSave = (original, submitted) => {
      const doc = prepare(submitted.doc);

      return prepareAndAttachSiblingDocs(submitted.doc, original, submitted.siblings)
        .then(function(siblings) {
          const extract = item => {
            item.parent = item.parent && ExtractLineage(item.parent);
            item.contact = item.contact && ExtractLineage(item.contact);
          };

          siblings.forEach(extract);
          extract(doc);

          // This must be done after prepareAndAttachSiblingDocs, as it relies
          // on the doc's parents being attached.
          const repeated = prepareRepeatedDocs(submitted.doc, submitted.repeats);

          return {
            docId: doc._id,
            preparedDocs: [ doc ].concat(repeated, siblings) // NB: order matters: #4200
          };
        });
    };

    // Prepares document to be bulk-saved at a later time, and for it to be
    // referenced by _id by other docs if required.
    const prepare = doc => {
      if (!doc._id) {
        doc._id = uuidV4();
      }

      if (!doc._rev) {
        doc.reported_date = Date.now();
      }

      return doc;
    };

    const prepareRepeatedDocs = (doc, repeated) => {
      const childData = (repeated && repeated.child_data) || [];
      return childData.map(child => {
        child.parent = ExtractLineage(doc);
        return prepare(child);
      });
    };

    const extractIfRequired = (name, value) => {
      return CONTACT_FIELD_NAMES.includes(name) ? ExtractLineage(value) : value;
    };

    // Mutates the passed doc to attach prepared siblings, and returns all
    // prepared siblings to be persisted.
    // This will (on a correctly configured form) attach the full parent to
    // doc, and in turn siblings. See internal comments.
    const prepareAndAttachSiblingDocs = (doc, original, siblings) => {
      if (!doc._id) {
        throw new Error('doc passed must already be prepared with an _id');
      }

      const preparedSiblings = [];
      let promiseChain = $q.resolve();

      CONTACT_FIELD_NAMES.forEach(fieldName => {
        let value = doc[fieldName];
        if (_.isObject(value)) {
          value = doc[fieldName]._id;
        }
        if (!value) {
          return;
        }
        if (value === 'NEW') {
          const preparedSibling = prepare(siblings[fieldName]);

          // by default all siblings are "person" types but can be overridden
          // by specifying the type and contact_type in the form
          if (!preparedSibling.type) {
            preparedSibling.type = 'person';
          }

          if (preparedSibling.parent === 'PARENT') {
            delete preparedSibling.parent;
            // Cloning to avoid the circular reference we would make:
            //   doc.fieldName.parent.fieldName.parent...
            doc[fieldName] = _.clone(preparedSibling);
            // Because we're assigning the actual doc referencem, the DB().get
            // to attach the full parent to the doc will also attach it here.
            preparedSibling.parent = doc;
          } else {
            doc[fieldName] = extractIfRequired(fieldName, preparedSibling);
          }

          preparedSiblings.push(preparedSibling);
        } else if (original &&
                   original[fieldName] &&
                   original[fieldName]._id === value) {
          doc[fieldName] = original[fieldName];
        } else {
          promiseChain = promiseChain.then(function() {
            return DB().get(value).then(function(dbFieldValue) {
              // In a correctly configured form one of these will be the
              // parent This must happen before we attempt to run
              // ExtractLineage on any siblings or repeats, otherwise they
              // will extract an incomplete lineage
              doc[fieldName] = extractIfRequired(fieldName, dbFieldValue);
            });
          });
        }
      });

      return promiseChain.then(() => preparedSiblings);
    };

    return function(form, docId, type) {
      return $q.resolve()
        .then(() => docId ? DB().get(docId) : null)
        .then(original => {
          const submitted = EnketoTranslation.contactRecordToJs(form.getDataStr({ irrelevant: false }));
          if (original) {
            submitted.doc = $.extend({}, original, submitted.doc);
          } else if (ContactTypes.isHardcodedType(type)) {
            // default hierarchy - maintain backwards compatibility
            submitted.doc.type = type;
          } else {
            // configured hierarchy
            submitted.doc.type = 'contact';
            submitted.doc.contact_type = type;
          }
          return prepareSubmittedDocsForSave(original, submitted);
        })
        .then(function(preparedDocs) {
          const primaryDoc = preparedDocs.preparedDocs.find(doc => doc.type === type);
          self.setLastChangedDoc(primaryDoc|| preparedDocs.preparedDocs[0]);

          return DB().bulkDocs(preparedDocs.preparedDocs)
            .then(function(bulkDocsResult) {
              const failureMessage = generateFailureMessage(bulkDocsResult);

              if (failureMessage) {
                throw new Error(failureMessage);
              }

              return {docId: preparedDocs.docId, bulkDocsResult: bulkDocsResult};
            });
        });
    };

  }
);
