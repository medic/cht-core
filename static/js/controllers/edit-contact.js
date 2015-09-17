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

      $scope.$on('ContactUpdated', populateParents);

      $scope.$on('EditContactInit', function(e, contact) {

        var formInstanceData;

        contact = contact || {};

        $scope.page = 0;
        $scope.primaryContact = {};
        $scope.errors = {
          page0: {},
          page1: {}
        };

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
          formInstanceData = Mega.jsToFormInstanceData(contact);
        } else {
          $scope.contact = {
            type: contact.type || 'district_hospital'
          };
          $scope.category = $scope.contact.type === 'person' ? 'person' : 'place';
          $scope.contactId = null;
        }

        var modal = $('#edit-contact');

        Enketo.renderFromXml(modal,
            Mega.generateXform(ContactSchema.get()[contact.type]),
            formInstanceData)
          .then(function(form) {
            $scope.enketo_contact = {
              type: $scope.contact.type,
              formInstance: form,
              docId: $scope.contactId,
            };
          });

        modal.modal('show');
      });

      $scope.setPage = function(page) {
        $scope.page = page;
      };

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
        if(docId) {
          DB.get().get(docId)
            .then(function(doc) {
              $.extend(doc, Enketo.recordToJs(form.getDataStr()));
              saveDoc(form, pane, doc);
            });
        } else {
          var doc = Enketo.recordToJs(form.getDataStr());
          doc.type = $scope.enketo_contact.type;
          saveDoc(form, pane, doc);
        }
      };

      function saveDoc(form, pane, doc) {
        if(!doc.parent) {
          doc.parent = {};
        }
        if(typeof doc.parent === 'string') {
          DB.get().get(doc.parent)
            .then(function(parent) {
              doc.parent = parent;
              DB.get().post(doc)
                .then(function(doc) {
                  form.resetView();
                  delete $scope.enketo_contact;
                  $rootScope.$broadcast('ContactUpdated', doc);
                  pane.done();
                })
                .catch(function(err) {
                  pane.done(translateFilter('Error updating contact'), err);
                });
            })
            .catch(function(err) {
              pane.done(translateFilter('Error updating contact'), err);
            });
        } else {
          DB.get().post(doc)
            .then(function(doc) {
              form.resetView();
              delete $scope.enketo_contact;
              $rootScope.$broadcast('ContactUpdated', doc);
              pane.done();
            })
            .catch(function(err) {
              pane.done(translateFilter('Error updating contact'), err);
            });
        }
      }
    }
  ]);

}());
