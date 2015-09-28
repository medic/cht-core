var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditContactCtrl',
    ['$q', '$rootScope', '$scope', '$state', 'translateFilter', 'ContactSchema', 'DbView', 'DB', 'Enketo', 'EnketoTranslation',
    function ($q, $rootScope, $scope, $state, translateFilter, ContactSchema, DbView, DB, Enketo, EnketoTranslation) {

      $scope.unmodifiedSchema = ContactSchema.get();
      $scope.contactTypes = Object.keys($scope.unmodifiedSchema);
      $scope.placeSchemas = ContactSchema.get();
      $scope.dependentPersonSchema = $scope.placeSchemas.person;
      delete $scope.dependentPersonSchema.fields.parent;
      delete $scope.placeSchemas.person;

      // Close listener for modal to discard Enketo data
      $(document).on('hidden.bs.modal', '#edit-contact', function() {
        $(this).find('.form-wrapper .container').empty();
        Enketo.unload($scope.enketo_contact && $scope.enketo_contact.formInstance);
        delete $scope.enketo_contact;
      });

      var populateParents = function() {
        var options = {
          params: {
            startkey: [],
            endkey: [{}],
            reduce: false,
            include_docs: true
          },
          targetScope: 'root'
        };
        DbView('facilities', options, function(err, results) {
          if (err) {
            return console.log('Error fetching parents', err);
          }
          results.push({
            name: translateFilter('New person'),
            type: 'person',
            _id: 'NEW',
            order: 1
          });
          $scope.parents = results;
        });
      };

      populateParents();

      $scope.setContactType = function(type) {
        $scope.contact.type = type;

        var modal = $('#edit-contact');

        Enketo.renderFromXmlString(modal,
            EnketoTranslation.generateXform($scope.unmodifiedSchema[type], { contact:$scope.dependentPersonSchema }))
          .then(function(form) {
            $scope.enketo_contact = {
              type: type,
              formInstance: form,
              docId: type === $scope.contact.type? $scope.contactId: null,
            };
            $scope.$apply();
          });
      };

      $scope.$on('ContactUpdated', populateParents);

      $scope.$on('EditContactInit', function(e, contact) {

        var formInstanceData;

        contact = contact || {};

        $scope.primaryContact = {};

        $scope.original = contact;
        if (contact._id) {
          $scope.contact = {
            name: contact.name,
            phone: contact.phone,
            type: contact.type,
            parent: contact.parent,
            contact: contact.contact,
            external_id: contact.external_id,
            rc_code: contact.rc_code,
            notes: contact.notes
          };
          $scope.contactId = contact._id;
          $scope.category = contact.type === 'person' ? 'person' : 'place';
          var fields = Object.keys($scope.unmodifiedSchema[contact.type].fields);
          formInstanceData = EnketoTranslation.jsToFormInstanceData(contact, fields);
        } else {
          $scope.contact = {
            type: contact.type || Object.keys($scope.placeSchemas)[0],
          };
          $scope.category = $scope.contact.type === 'person' ? 'person' : 'place';
          $scope.contactId = null;
        }

        var modal = $('#edit-contact');

        Enketo.renderFromXmlString(modal,
            EnketoTranslation.generateXform($scope.unmodifiedSchema[$scope.contact.type]),
            formInstanceData)
          .then(function(form) {
            $scope.enketo_contact = {
              type: $scope.contact.type,
              formInstance: form,
              docId: $scope.contactId,
            };
          })
          .then(function() {
            modal.modal('show');
          }).catch(console.error.bind(console));
      });

      $scope.save = function() {
        var form = $scope.enketo_contact.formInstance,
            docId = $scope.enketo_contact.docId,
            $modal = $('#edit-contact');

        form.validate();
        if(!form.isValid()) {
          return $q.reject(new Error('Form is invalid'));
        }
        // don't `start` the modal until form validation is handled - otherwise
        // fields are disabled, and ignored for validation.
        var pane = modal.start($modal);
        Promise.resolve()
          .then(function() {
            if(docId) {
              return DB.get().get(docId);
            }
            return null;
          })
          .then(function(original) {
            var submitted = EnketoTranslation.recordToJs(form.getDataStr());
            var extras;
            if(_.isArray(submitted)) {
              extras = submitted[1];
              submitted = submitted[0];
            } else {
              extras = {};
            }
            if(original) {
              submitted = $.extend({}, original, submitted);
            } else {
              submitted.type = $scope.enketo_contact.type;
            }

            return saveDoc(submitted, original, extras);
          })
          .then(function(doc) {
            delete $scope.enketo_contact;
            $rootScope.$broadcast('ContactUpdated', doc);
            $state.go('contacts.detail', { id: doc.id });
            pane.done();
          })
          .catch(function(err) {
            pane.done(translateFilter('Error updating contact'), err);
          });
      };

      function saveDoc(doc, original, extras) {
        return Promise.resolve()
          .then(function() {
            var schema = $scope.unmodifiedSchema[doc.type];

            // sequentially update all dirty db fields
            var result = Promise.resolve(doc);
            _.each(schema.fields, function(conf, f) {
              var customType = conf.type.match(/^(db|custom):(.*)$/);
              if (customType) {
                result = result.then(function(doc) {
                  if(!doc[f]) {
                    doc[f] = {};
                  } else if(doc[f] === 'NEW') {
                    var extra = extras[f];
                    extra.type = customType[2];
                    return DB.get().post(extra)
                      .then(function(response) {
                        return DB.get().get(response.id);
                      })
                      .then(function(newlySavedObject) {
                        doc[f] = newlySavedObject;
                        return doc;
                      });
                  } else if(original && doc[f] === original[f]._id) {
                    doc[f] = original[f];
                  } else {
                    return DB.get().get(doc[f])
                      .then(function(dbFieldValue) {
                        doc[f] = dbFieldValue;
                        return doc;
                      });
                  }
                  return doc;
                });
              }
            });
            return result;
          })
          .then(function(doc) {
            if(doc._id) {
              return DB.get().put(doc);
            } else {
              return DB.get().post(doc);
            }
          });
      }
    }
  ]);

}());
