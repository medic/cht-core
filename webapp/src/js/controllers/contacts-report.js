angular.module('inboxControllers').controller('ContactsReportCtrl',
  function (
    $log,
    $ngRedux,
    $scope,
    $state,
    $translate,
    ContactsActions,
    Enketo,
    Geolocation,
    GlobalActions,
    Selectors,
    Snackbar,
    Telemetry,
    TranslateFrom,
    XmlForms
  ) {

    'use strict';
    'ngInject';

    const telemetryData = {
      preRender: Date.now()
    };

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        enketoStatus: Selectors.getEnketoStatus(state),
        enketoSaving: Selectors.getEnketoSavingStatus(state),
        enketoError: Selectors.getEnketoError(state),
        selectedContact: Selectors.getSelectedContact(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const contactsActions = ContactsActions(dispatch);
      const globalActions = GlobalActions(dispatch);
      return {
        clearRightActionBar: globalActions.clearRightActionBar,
        navigationCancel: globalActions.navigationCancel,
        setCancelCallback: globalActions.setCancelCallback,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setEnketoSavingStatus: globalActions.setEnketoSavingStatus,
        setEnketoError: globalActions.setEnketoError,
        setShowContent: globalActions.setShowContent,
        setSelectedContact: contactsActions.setSelectedContact,
        setTitle: globalActions.setTitle
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    const geoHandle = Geolocation();

    const markFormEdited = function() {
      ctrl.setEnketoEditedStatus(true);
    };

    const resetFormError = function() {
      if (ctrl.enketoError) {
        ctrl.setEnketoError(null);
      }
    };

    resetFormError();

    const setCancelCallback = function() {
      ctrl.setCancelCallback(function() {
        $state.go('contacts.detail', { id: $state.params.id });
      });
    };

    const render = function(contactId, formId) {
      ctrl.setSelectedContact(contactId, { merge: true })
        .then(() => {
          setCancelCallback();
          return XmlForms.get(formId);
        })
        .then(function(form) {
          const instanceData = {
            source: 'contact',
            contact: ctrl.selectedContact.doc,
          };
          ctrl.setEnketoEditedStatus(false);
          ctrl.setTitle(TranslateFrom(form.title));
          return Enketo.render('#contact-report', form, instanceData, markFormEdited, resetFormError);
        })
        .then(function(formInstance) {
          ctrl.form = formInstance;
          ctrl.loadingForm = false;
          telemetryData.postRender = Date.now();
          telemetryData.form = formId;

          Telemetry.record(
            `enketo:contacts:${telemetryData.form}:add:render`,
            telemetryData.postRender - telemetryData.preRender);
        })
        .catch(err => {
          $log.error('Error loading form', err);
          ctrl.errorTranslationKey = err.translationKey || 'error.loading.form';
          ctrl.contentError = true;
          ctrl.loadingForm = false;
        });
    };

    ctrl.save = function() {
      if (ctrl.enketoSaving) {
        $log.debug('Attempted to call "contacts-report.save" more than once');
        return;
      }

      telemetryData.preSave = Date.now();
      Telemetry.record(
        `enketo:contacts:${telemetryData.form}:add:user_edit_time`,
        telemetryData.preSave - telemetryData.postRender);

      ctrl.setEnketoSavingStatus(true);
      resetFormError();
      Enketo.save($state.params.formId, ctrl.form, geoHandle)
        .then(function(docs) {
          $log.debug('saved report and associated docs', docs);
          ctrl.setEnketoSavingStatus(false);
          $translate('report.created').then(Snackbar);
          ctrl.setEnketoEditedStatus(false);
          $state.go('contacts.detail', { id: $state.params.id });
        })
        .then(() => {
          telemetryData.postSave = Date.now();

          Telemetry.record(
            `enketo:contacts:${telemetryData.form}:add:save`,
            telemetryData.postSave - telemetryData.preSave);
        })
        .catch(function(err) {
          ctrl.setEnketoSavingStatus(false);
          $log.error('Error submitting form data: ', err);
          $translate('error.report.save').then(function(msg) {
            ctrl.setEnketoError(msg);
          });
        });
    };

    ctrl.form = null;
    ctrl.loadingForm = true;
    ctrl.clearRightActionBar();
    ctrl.setShowContent(true);
    setCancelCallback();

    render($state.params.id, $state.params.formId);

    $scope.$on('$destroy', function() {
      geoHandle && geoHandle.cancel();
      unsubscribe();
      if (!$state.includes('contacts.report')) {
        ctrl.setTitle();
        Enketo.unload(ctrl.form);
      }
    });
  }
);
