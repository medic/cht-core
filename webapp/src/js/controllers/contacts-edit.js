angular.module('inboxControllers').controller('ContactsEditCtrl',
  function (
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    $timeout,
    $translate,
    ContactSave,
    ContactTypes,
    Enketo,
    GlobalActions,
    LineageModelGenerator,
    Selectors,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    var ctrl = this;
    var mapStateToTarget = function(state) {
      return {
        enketoStatus: Selectors.getEnketoStatus(state),
        enketoSaving: Selectors.getEnketoSavingStatus(state),
        loadingContent: Selectors.getLoadingContent(state)
      };
    };
    var mapDispatchToTarget = function(dispatch) {
      var globalActions = GlobalActions(dispatch);
      return {
        setCancelCallback: globalActions.setCancelCallback,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setEnketoSavingStatus: globalActions.setEnketoSavingStatus,
        setEnketoError: globalActions.setEnketoError,
        setLoadingContent: globalActions.setLoadingContent,
        setShowContent: globalActions.setShowContent
      };
    };
    var unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    if (!$state.params.id) {
      // adding a new contact, deselect the old one
      $scope.clearSelected();
      $scope.settingSelected();
    }
    ctrl.setLoadingContent(true);
    ctrl.setShowContent(true);
    ctrl.setCancelCallback(function() {
      if ($state.params.from === 'list') {
        $state.go('contacts.detail', { id: null });
      } else {
        $state.go('contacts.detail', { id: $state.params.id || $state.params.parent_id });
      }
    });

    var getFormInstanceData = function() {
      const type = $scope.contact && ($scope.contact.contact_type || $scope.contact.type);
      if (!type) {
        return null;
      }
      var result = {};
      result[type] = $scope.contact;
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

    var getForm = function(contact) {
      $scope.primaryContact = {};
      $scope.original = contact;
      let formId;
      let titleKey;
      const typeId = contact ? (contact.contact_type || contact.type) : $state.params.type;
      return ContactTypes.get(typeId).then(type => {
        if (!type) {
          $log.error(`Unknown contact type "${typeId}"`);
          return;
        }

        if (contact) { // editing
          $scope.contact = contact;
          $scope.contactId = contact._id;
          titleKey = type.edit_key;
          formId = type.edit_form || type.create_form;
        } else { // adding
          $scope.contact = {
            type: 'contact',
            contact_type: $state.params.type,
            parent: $state.params.parent_id
          };
          $scope.contactId = null;
          formId = type.create_form;
          titleKey = type.create_key;
        }

        $translate.onReady()
          .then(() => $translate(titleKey))
          .then($scope.setTitle);

        return formId;
      });
    };

    var markFormEdited = function() {
      ctrl.setEnketoEditedStatus(true);
    };

    var renderForm = function(formId) {
      return $timeout(function() {
        if (!formId) {
          // Disable next and prev buttons
          $('#contact-form')
              .find('.form-footer .btn')
              .filter('.previous-page, .next-page')
              .addClass('disabled');
          return;
        }
        ctrl.setEnketoEditedStatus(false);
        return Enketo.renderContactForm('#contact-form', formId, getFormInstanceData(), markFormEdited);
      });
    };

    var setEnketoContact = function(formInstance) {
      $scope.enketoContact = {
        type: $scope.contact.contact_type || $scope.contact.type,
        formInstance: formInstance,
        docId: $scope.contactId,
      };
    };

    getContact()
      .then(getForm)
      .then(renderForm)
      .then(setEnketoContact)
      .then(function() {
        ctrl.setLoadingContent(false);
      })
      .catch(function(err) {
        ctrl.errorTranslationKey = err.translationKey || 'error.loading.form';
        ctrl.setLoadingContent(false);
        $scope.contentError = true;
        $log.error('Error loading contact form.', err);
      });

    $scope.save = function() {
      if (ctrl.enketoSaving) {
        $log.debug('Attempted to call contacts-edit:$scope.save more than once');
        return;
      }

      var form = $scope.enketoContact.formInstance;
      var docId = $scope.enketoContact.docId;
      ctrl.setEnketoSavingStatus(true);
      ctrl.setEnketoError(null);

      return form.validate()
        .then(function(valid) {
          if(!valid) {
            throw new Error('Validation failed.');
          }

          var type = $scope.enketoContact.type;
          return ContactSave(form, docId, type)
            .then(function(result) {
              $log.debug('saved report', result);
              ctrl.setEnketoSavingStatus(false);
              $translate(docId ? 'contact.updated' : 'contact.created').then(Snackbar);
              ctrl.setEnketoEditedStatus(false);
              $state.go('contacts.detail', { id: result.docId });
            })
            .catch(function(err) {
              ctrl.setEnketoSavingStatus(false);
              $log.error('Error submitting form data', err);
              $translate('Error updating contact').then(function(msg) {
                ctrl.setEnketoError(msg);
              });
            });
        })
        .catch(function() {
          // validation messages will be displayed for individual fields.
          // That's all we want, really.
          ctrl.setEnketoSavingStatus(false);
          $scope.$apply();
        });
    };

    $scope.$on('$destroy', function() {
      unsubscribe();
      if (!$state.includes('contacts.add')) {
        $scope.setTitle();
        if ($scope.enketoContact && $scope.enketoContact.formInstance) {
          Enketo.unload($scope.enketoContact.formInstance);
        }
      }
    });

  }
);
