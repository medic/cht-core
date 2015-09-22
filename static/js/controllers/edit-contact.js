var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditContactCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'ContactSchema', 'DbView', 'DB', 'Enketo', 'Mega',
    function ($scope, $rootScope, translateFilter, ContactSchema, DbView, DB, Enketo, Mega) {

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

      $scope.unmodifiedSchema = ContactSchema.get();
      $scope.schemas = ContactSchema.get();
      // TODO shouldn't really remove person like this, but it's quite useful
      // in this particular use of `schemas`.  Maybe this var just needs a better
      // name... e.g. `placeSchemas`
      $scope.dependentPersonSchema = $scope.schemas.person;
      delete $scope.dependentPersonSchema.fields.parent;

      delete $scope.schemas.person;

      $scope.setContactType = function(type) {
        $scope.contact.type = type;

        var modal = $('#edit-contact');
        var enketoContainer = modal.find('.form.' + type);
        // TODO would be nice if we didn't have to reset the form every time
        // but doesn't work nicely right now.  So instead, discard all other
        // forms, and load this one fresh every time.
        modal.find('.form .container').empty();
        if(true || enketoContainer.find('.container').is(':empty')) {
          // TODO might want to match schemas to fields automatically

          Enketo.renderFromXml(enketoContainer,
              Mega.generateXform($scope.unmodifiedSchema[type], { contact:$scope.dependentPersonSchema }))
            .then(function(form) {
              $scope.enketo_contact = {
                type: type,
                formInstance: form,
                docId: type === $scope.contact.type? $scope.contactId: null,
              };
              $scope.$apply();
            });
        }
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
          formInstanceData = Mega.jsToFormInstanceData(contact, fields);
        } else {
          $scope.contact = {
            type: contact.type || 'district_hospital'
          };
          $scope.category = $scope.contact.type === 'person' ? 'person' : 'place';
          $scope.contactId = null;
        }

        var modal = $('#edit-contact');

        if(contact.type) {
          Enketo.renderFromXml(modal.find('.form.' + contact.type),
              Mega.generateXform($scope.unmodifiedSchema[contact.type]),
              formInstanceData)
            .then(function(form) {
              $scope.enketo_contact = {
                type: contact.type,
                formInstance: form,
                docId: $scope.contactId,
              };
            });
        } else {
          var types = Object.keys($scope.schemas);
          $scope.setContactType(types[0] === 'person'? types[1]: types[0]);
        }

        modal.modal('show');
      });

      $scope.save = function() {
        var form = $scope.enketo_contact.formInstance,
            docId = $scope.enketo_contact.docId,
            $modal = $('#edit-contact');

        form.validate();
        if(!form.isValid()) {
          return console.log('[enketo] form invalid');
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
            var submitted = Enketo.recordToJs(form.getDataStr());
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
            form.resetView();
            delete $scope.enketo_contact;
            $rootScope.$broadcast('ContactUpdated', doc);
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
