var _ = require('underscore'),
    uuidV4 = require('uuid/v4');

angular.module('inboxControllers').controller('ContactsEditCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    $timeout,
    $translate,
    ContactForm,
    ContactSchema,
    DB,
    Enketo,
    EnketoTranslation,
    ExtractLineage,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    $scope.loadingContent = true;
    $scope.setShowContent(true);
    $scope.setCancelTarget(function() {
      $state.go('contacts.detail', { id: $state.params.id || $state.params.parent_id });
    });

    var setTitle = function() {
      var key = '';
      if ($scope.category === 'person') {
        if ($scope.contactId) {
          key = 'contact.type.person.edit';
        } else {
          key = 'contact.type.person.new';
        }
      } else {
        if ($scope.contactId) {
          key = 'contact.type.place.edit';
        } else {
          key = 'contact.type.place.new';
        }
      }
      $translate.onReady().then(function() {
        return $translate(key);
      }).then($scope.setTitle);
    };

    var getFormInstanceData = function() {
      if (!$scope.contact || !$scope.contact.type) {
        return null;
      }
      var result = {};
      result[$scope.contact.type] = $scope.contact;
      return result;
    };

    var getContact = function() {
      if ($state.params.id) {
        return DB().get($state.params.id);
      }
      return $q.resolve();
    };

    var getCategory = function(type) {
      return type === 'person' ? 'person' : 'place';
    };

    var getForm = function(contact) {
      $scope.primaryContact = {};
      $scope.original = contact;
      if (contact) {
        $scope.contact = contact;
        $scope.contactId = contact._id;
        $scope.category = getCategory(contact.type);
        setTitle();
        return ContactForm.forEdit(contact.type, { contact: $scope.dependentPersonSchema });
      }

      $scope.contact = {
        type: $state.params.type,
        parent: $state.params.parent_id
      };

      $scope.category = getCategory($scope.contact.type);
      $scope.contactId = null;
      setTitle();

      if ($scope.contact.type) {
        var extras = $scope.contact.type === 'person' ? null : { contact: $scope.dependentPersonSchema };
        return ContactForm.forCreate($scope.contact.type, extras);
      }
      return $q.resolve();
    };

    var markFormEdited = function() {
      $scope.enketoStatus.edited = true;
    };

    var renderForm = function(form) {
      return $timeout(function() {
        var container = $('#contact-form');
        if (!form) {
          // Disable next and prev buttons
          container.find('.form-footer .btn')
              .filter('.previous-page, .next-page')
              .addClass('disabled');
          return;
        }
        var instanceData = getFormInstanceData();
        if (form.id) {
          return Enketo.renderContactForm('#contact-form', form.id, instanceData, markFormEdited);
        }
        return Enketo.renderFromXmlString('#contact-form', form.xml, instanceData, markFormEdited);
      });
    };

    var setEnketoContact = function(formInstance) {
      $scope.enketoContact = {
        type: $scope.contact.type,
        formInstance: formInstance,
        docId: $scope.contactId,
      };
    };

    $scope.unmodifiedSchema = ContactSchema.get();
    $scope.dependentPersonSchema = ContactSchema.get('person');
    delete $scope.dependentPersonSchema.fields.parent;

    getContact()
      .then(function(contact) {
        if (!contact) {
          // adding a new contact, deselect the old one
          $scope.clearSelected();
          $scope.settingSelected();
        }

        return contact;
      })
      .then(getForm)
      .then(renderForm)
      .then(setEnketoContact)
      .then(function() {
        $scope.loadingContent = false;
      })
      .catch(function(err) {
        $scope.loadingContent = false;
        $scope.contentError = true;
        $log.error('Error loading contact form.', err);
      });

    $scope.save = function() {
      if ($scope.enketoStatus.saving) {
        $log.debug('Attempted to call contacts-edit:$scope.save more than once');
        return;
      }

      var form = $scope.enketoContact.formInstance;
      var docId = $scope.enketoContact.docId;
      $scope.enketoStatus.saving = true;
      $scope.enketoStatus.error = null;

      return form.validate()
        .then(function(valid) {
          if(!valid) {
            throw new Error('Validation failed.');
          }

          return save(form, docId)
            .then(function(result) {
              $log.debug('saved report', result);
              $scope.enketoStatus.saving = false;
              $translate(docId ? 'contact.updated' : 'contact.created').then(Snackbar);
              $state.go('contacts.detail', { id: result.docId });
            })
            .catch(function(err) {
              $scope.enketoStatus.saving = false;
              $log.error('Error submitting form data', err);
              $translate('Error updating contact').then(function(msg) {
                $scope.enketoStatus.error = msg;
              });
            });
        })
        .catch(function() {
          // validation messages will be displayed for individual fields.
          // That's all we want, really.
          $scope.enketoStatus.saving = false;
          $scope.$apply();
        });
    };

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
      }, undefined);
    }

    function save(form, docId) {
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
            submitted.doc.type = $scope.enketoContact.type;
          }

          return prepareSubmittedDocsForSave(original, submitted);
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
          child.parent = ExtractLineage(doc.contact);
          return prepare(child);
        });
      } else {
        return [];
      }
    }

    // Mutates the passed doc to attach prepared siblings, and returns all
    // prepared siblings to be persisted
    function prepareAndAttachSiblingDocs(doc, original, siblings) {
      if (!doc._id) {
        throw new Error('doc passed must already be prepared with an _id');
      }

      var preparedSiblings = [];
      var schema = $scope.unmodifiedSchema[doc.type];
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
              if (fieldName === 'parent') {
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
                if (fieldName === 'parent') {
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

    function prepareSubmittedDocsForSave(original, submitted) {
      var doc = prepare(submitted.doc);
      var repeated = prepareRepeatedDocs(submitted.doc, submitted.repeats);

      return prepareAndAttachSiblingDocs(submitted.doc, original, submitted.siblings)
        .then(function(siblings) {
          return {
            docId: doc._id,
            preparedDocs: [].concat(repeated, siblings, doc)
          };
        });
    }

    $scope.$on('$destroy', function() {
      if (!$state.includes('contacts.add')) {
        $scope.setTitle();
        if ($scope.enketoContact && $scope.enketoContact.formInstance) {
          Enketo.unload($scope.enketoContact.formInstance);
        }
      }
    });

  }
);
