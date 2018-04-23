var _ = require('underscore');
var uuidV4 = require('uuid/v4');

angular.module('inboxServices').service('ContactSave',
  function(
    $q,
    DB,
    EnketoTranslation,
    ExtractLineage
  ) {

    'use strict';
    'ngInject';

    function generateFailureMessage(bulkDocsResult) {
      return _.reduce(bulkDocsResult, function(msg, result) {
        var newMsg = msg;
        if (!result.ok) {
         if (!newMsg) {
          newMsg = 'Some documents did not save correctly: ';
         }

         newMsg += result.id + ' with ' + result.message + '; ';
        }
        return newMsg;
      }, null);
    }

    function prepareSubmittedDocsForSave(schema, original, submitted) {
      var doc = prepare(submitted.doc);

      return prepareAndAttachSiblingDocs(schema, submitted.doc, original, submitted.siblings)
        .then(function(siblings) {
          var extract = function(item) {
            item.parent = item.parent && ExtractLineage(item.parent);
            item.contact = item.contact && ExtractLineage(item.contact);
          };

          siblings.forEach(extract);
          extract(doc);

          // This must be done after prepareAndAttachSiblingDocs, as it relies
          // on the doc's parents being attached.
          var repeated = prepareRepeatedDocs(submitted.doc, submitted.repeats);

          return {
            docId: doc._id,
            preparedDocs: [ doc ].concat(repeated, siblings) // NB: order matters: #4200
          };
        });
    }

    // Prepares document to be bulk-saved at a later time, and for it to be
    // referenced by _id by other docs if required.
    function prepare(doc) {
      if(!doc._id) {
        doc._id = uuidV4();
      }

      if (!doc._rev) {
        doc.reported_date = Date.now();
      }

      return doc;
    }

    function prepareRepeatedDocs(doc, repeated) {
      if (repeated && repeated.child_data) {
        return _.map(repeated.child_data, function(child) {
          child.parent = ExtractLineage(doc);
          return prepare(child);
        });
      } else {
        return [];
      }
    }

    function extractIfRequired(name, value) {
      if (name === 'parent' || name === 'contact') {
        return ExtractLineage(value);
      }
      return value;
    }

    // Mutates the passed doc to attach prepared siblings, and returns all
    // prepared siblings to be persisted.
    // This will (on a correctly configured form) attach the full parent to
    // doc, and in turn siblings. See internal comments.
    function prepareAndAttachSiblingDocs(schema, doc, original, siblings) {
      if (!doc._id) {
        throw new Error('doc passed must already be prepared with an _id');
      }

      var preparedSiblings = [];
      var promiseChain = $q.resolve();

      _.each(schema.fields, function(fieldConf, fieldName) {
        var customType = fieldConf.type.match(/^(db|custom):(.*)$/);
        if (customType) {
          var value = doc[fieldName];
          if (_.isObject(value)) {
            value = doc[fieldName]._id;
          }
          if(!value) {
            doc[fieldName] = {};
          } else if(value === 'NEW') {
            var preparedSibling = prepare(siblings[fieldName]);
            preparedSibling.type = customType[2];

            var isChild = preparedSibling.parent === 'PARENT' ||
                          (!preparedSibling.parent && fieldConf.parent === 'PARENT');

            if (isChild) {
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
        }
      });

      return promiseChain.then(function() {
        return preparedSiblings;
      });
    }

    return function(schema, form, docId, type) {
      return $q.resolve()
        .then(function() {
          if(docId) {
            return DB().get(docId);
          }
          return null;
        })
        .then(function(original) {
          var submitted = EnketoTranslation.contactRecordToJs(form.getDataStr({ irrelevant: false }));

          if(original) {
            submitted.doc = $.extend({}, original, submitted.doc);
          } else {
            submitted.doc.type = type;
          }

          return prepareSubmittedDocsForSave(schema, original, submitted);
        })
        .then(function(preparedDocs) {
          return DB().bulkDocs(preparedDocs.preparedDocs)
            .then(function(bulkDocsResult) {
              var failureMessage = generateFailureMessage(bulkDocsResult);

              if (failureMessage) {
                throw new Error(failureMessage);
              }

              return {docId: preparedDocs.docId, bulkDocsResult: bulkDocsResult};
            });
        });
    };

  }
);
