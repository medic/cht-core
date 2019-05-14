angular.module('inboxControllers').controller('ContactsReportCtrl',
  function (
    $log,
    $ngRedux,
    $scope,
    $state,
    $translate,
    ContactViewModelGenerator,
    Enketo,
    Geolocation,
    GlobalActions,
    Selectors,
    Snackbar,
    Telemetry,
    TranslateFrom,
    XmlForm
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
        selectedContact: Selectors.getSelectedContact(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      return {
        clearRightActionBar: globalActions.clearRightActionBar,
        setCancelCallback: globalActions.setCancelCallback,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setEnketoSavingStatus: globalActions.setEnketoSavingStatus,
        setEnketoError: globalActions.setEnketoError,
        setShowContent: globalActions.setShowContent
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    var geolocation;
    Geolocation()
      .then(function(position) {
        geolocation = position;
      })
      .catch($log.warn);

    var markFormEdited = function() {
      ctrl.setEnketoEditedStatus(true);
    };

    var setCancelCallback = function() {
      ctrl.setCancelCallback(function() {
        $state.go('contacts.detail', { id: $state.params.id });
      });
    };

    var render = function(contact, options) {
      $scope.setSelected(contact, options);
      setCancelCallback();
      return XmlForm($state.params.formId, { include_docs: true })
        .then(function(form) {
          var instanceData = {
            source: 'contact',
            contact: contact.doc,
          };
          ctrl.setEnketoEditedStatus(false);
          return Enketo
            .render('#contact-report', form.id, instanceData, markFormEdited)
            .then(function(formInstance) {
              $scope.setTitle(TranslateFrom(form.doc.title));
              ctrl.form = formInstance;
              ctrl.loadingForm = false;
            })
            .then(() => {
              telemetryData.postRender = Date.now();
              telemetryData.form = $state.params.formId;

              Telemetry.record(
                `enketo:contacts:${telemetryData.form}:add:render`,
                telemetryData.postRender - telemetryData.preRender);
            });
        });
    };

    ctrl.save = function() {
      if (ctrl.enketoSaving) {
        $log.debug('Attempted to call contacts-report:$scope.save more than once');
        return;
      }

      telemetryData.preSave = Date.now();
      Telemetry.record(
        `enketo:contacts:${telemetryData.form}:add:user_edit_time`,
        telemetryData.preSave - telemetryData.postRender);

      ctrl.setEnketoSavingStatus(true);
      ctrl.setEnketoError(null);
      Enketo.save($state.params.formId, ctrl.form, geolocation)
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
    var options = { merge: true };
    ContactViewModelGenerator.getContact($state.params.id, options)
      .then(function(contact) {
        return render(contact, options);
      })
      .catch(function(err) {
        $log.error('Error loading form', err);
        ctrl.errorTranslationKey = err.translationKey || 'error.loading.form';
        ctrl.contentError = true;
        ctrl.loadingForm = false;
      });

    $scope.$on('$destroy', function() {
      unsubscribe();
      if (!$state.includes('contacts.report')) {
        $scope.setTitle();
        Enketo.unload(ctrl.form);
      }
    });
  }
);
