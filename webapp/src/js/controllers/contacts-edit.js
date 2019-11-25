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
    DB,
    Enketo,
    GlobalActions,
    LineageModelGenerator,
    Selectors,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        enketoStatus: Selectors.getEnketoStatus(state),
        enketoSaving: Selectors.getEnketoSavingStatus(state),
        loadingContent: Selectors.getLoadingContent(state),
        enketoError: Selectors.getEnketoError(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      return {
        navigationCancel: globalActions.navigationCancel,
        unsetSelected: globalActions.unsetSelected,
        setCancelCallback: globalActions.setCancelCallback,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setEnketoSavingStatus: globalActions.setEnketoSavingStatus,
        setEnketoError: globalActions.setEnketoError,
        setLoadingContent: globalActions.setLoadingContent,
        setShowContent: globalActions.setShowContent,
        setTitle: globalActions.setTitle,
        settingSelected: globalActions.settingSelected
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    if (!$state.params.id) {
      // adding a new contact, deselect the old one
      ctrl.unsetSelected();
      ctrl.settingSelected();
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
      const type = ctrl.contact && (ctrl.contact.contact_type || ctrl.contact.type);
      if (!type) {
        return null;
      }
      var result = {};
      result[type] = ctrl.contact;
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
      let formId;
      let titleKey;
      const typeId = contact ? (contact.contact_type || contact.type) : $state.params.type;
      return ContactTypes.get(typeId).then(type => {
        if (!type) {
          $log.error(`Unknown contact type "${typeId}"`);
          return;
        }

        if (contact) { // editing
          ctrl.contact = contact;
          ctrl.contactId = contact._id;
          titleKey = type.edit_key;
          formId = type.edit_form || type.create_form;
        } else { // adding
          ctrl.contact = {
            type: 'contact',
            contact_type: $state.params.type,
            parent: $state.params.parent_id
          };
          ctrl.contactId = null;
          formId = type.create_form;
          titleKey = type.create_key;
        }

        $translate.onReady()
          .then(() => $translate(titleKey))
          .then(ctrl.setTitle);

        return formId;
      });
    };

    var markFormEdited = function() {
      ctrl.setEnketoEditedStatus(true);
    };
    
    var resetFormError = function() {
      if (ctrl.enketoError) {
        ctrl.setEnketoError(null);
      }
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
        return DB().get(formId);
      })
      .then(form => {
        return Enketo.renderContactForm('#contact-form', form, getFormInstanceData(), markFormEdited, resetFormError);
      });
    };

    var setEnketoContact = function(formInstance) {
      ctrl.enketoContact = {
        type: ctrl.contact.contact_type || ctrl.contact.type,
        formInstance: formInstance,
        docId: ctrl.contactId,
      };
    };
                                              
    resetFormError();

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
        ctrl.contentError = true;
        $log.error('Error loading contact form.', err);
      });

    ctrl.save = function() {
      if (ctrl.enketoSaving) {
        $log.debug('Attempted to call contacts-edit:$scope.save more than once');
        return;
      }

      var form = ctrl.enketoContact.formInstance;
      var docId = ctrl.enketoContact.docId;
      ctrl.setEnketoSavingStatus(true);
      ctrl.setEnketoError(null);

      return form.validate()
        .then(function(valid) {
          if(!valid) {
            throw new Error('Validation failed.');
          }

          var type = ctrl.enketoContact.type;
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
          $timeout(() => ctrl.setEnketoSavingStatus(false));
        });
    };

    $scope.$on('$destroy', function() {
      unsubscribe();
      if (!$state.includes('contacts.add')) {
        ctrl.setTitle();
        if (ctrl.enketoContact && ctrl.enketoContact.formInstance) {
          Enketo.unload(ctrl.enketoContact.formInstance);
        }
      }
    });

  }
);
