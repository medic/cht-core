angular.module('inboxControllers').controller('ContactsEditCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    $timeout,
    $translate,
    ContactForm,
    ContactSave,
    ContactSchema,
    Enketo,
    LineageModelGenerator,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    $scope.loadingContent = true;
    $scope.setShowContent(true);
    $scope.setCancelTarget(function() {
      if ($state.params.from === 'list') {
        $state.go('contacts.detail', { id: null });
      } else {
        $state.go('contacts.detail', { id: $state.params.id || $state.params.parent_id });
      }
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
      var id = $state.params.id;
      if (!id) {
        return $q.resolve();
      }
      return LineageModelGenerator.contact(id, { merge: true })
        .then(function(result) {
          return result.doc;
        });
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
        $scope.enketoStatus.edited = false;
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
        $scope.errorTranslationKey = err.translationKey || 'error.loading.form';
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

          var type = $scope.enketoContact.type;
          return ContactSave($scope.unmodifiedSchema[type], form, docId, type)
            .then(function(result) {
              $log.debug('saved report', result);
              $scope.enketoStatus.saving = false;
              $translate(docId ? 'contact.updated' : 'contact.created').then(Snackbar);
              $scope.enketoStatus.edited = false;
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
