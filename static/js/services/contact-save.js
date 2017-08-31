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
      var repeated = prepareRepeatedDocs(submitted.doc, submitted.repeats);

      return prepareAndAttachSiblingDocs(schema, submitted.doc, original, submitted.siblings)
        .then(function(siblings) {
          return {
            docId: doc._id,
            preparedDocs: [].concat(repeated, siblings, doc)
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

    // Mutates the passed doc to attach prepared siblings, and returns all
    // prepared siblings to be persisted
    function prepareAndAttachSiblingDocs(schema, doc, original, siblings) {
      if (!doc._id) {
        throw new Error('doc passed must already be prepared with an _id');
      }

      var preparedSiblings = [];
      var promiseChain = $q.resolve();

      _.each(schema.fields, function(fieldConf, fieldName) {
        var customType = fieldConf.type.match(/^(db|custom):(.*)$/);
        if (customType) {
          if(!doc[fieldName]) {
            doc[fieldName] = {};
          } else if(doc[fieldName] === 'NEW') {
            var preparedSibling = prepare(siblings[fieldName]);
            preparedSibling.type = customType[2];

            var isChild = preparedSibling.parent === 'PARENT' ||
                          (!preparedSibling.parent && fieldConf.parent === 'PARENT');

            if (isChild) {
              delete preparedSibling.parent;
              // Cloning to avoid the circular reference we would make:
              //   doc.fieldName.parent.fieldName.parent...
              doc[fieldName] = _.clone(preparedSibling);
              preparedSibling.parent = doc;
            } else {
              if (fieldName === 'parent' || fieldName === 'contact') {
                doc[fieldName] = ExtractLineage(preparedSibling);
              } else {
                doc[fieldName] = preparedSibling;
              }
            }

            preparedSiblings.push(preparedSibling);
          } else if(original &&
                    original[fieldName] &&
                    original[fieldName]._id === doc[fieldName]) {

            doc[fieldName] = original[fieldName];
          } else {
            promiseChain = promiseChain.then(function() {
              return DB().get(doc[fieldName]).then(function(dbFieldValue) {
                if (fieldName === 'parent' || fieldName === 'contact') {
                  doc[fieldName] = ExtractLineage(dbFieldValue);
                } else {
                  doc[fieldName] = dbFieldValue;
                }
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
          var submitted = EnketoTranslation.contactRecordToJs(form.getDataStr());

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
