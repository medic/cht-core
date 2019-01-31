angular.module('inboxControllers').controller('ContactsReportCtrl',
  function (
    $log,
    $ngRedux,
    $scope,
    $state,
    $translate,
    Actions,
    ContactViewModelGenerator,
    Enketo,
    Geolocation,
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

    var ctrl = this;
    var unsubscribe = $ngRedux.connect(null, Actions)(ctrl);

    var geolocation;
    Geolocation()
      .then(function(position) {
        geolocation = position;
      })
      .catch($log.warn);

    var markFormEdited = function() {
      $scope.enketoStatus.edited = true;
    };

    var setCancelCallback = function() {
      ctrl.setCancelCallback(function() {
        $state.go('contacts.detail', { id: $state.params.id });
      });
    };

    var render = function(contact) {
      $scope.setSelected(contact);
      setCancelCallback();
      return XmlForm($state.params.formId, { include_docs: true })
        .then(function(form) {
          var instanceData = {
            source: 'contact',
            contact: contact.doc,
          };
          $scope.enketoStatus.edited = false;
          return Enketo
            .render('#contact-report', form.id, instanceData, markFormEdited)
            .then(function(formInstance) {
              $scope.setTitle(TranslateFrom(form.doc.title));
              $scope.form = formInstance;
              $scope.loadingForm = false;
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

    $scope.save = function() {
      if ($scope.enketoStatus.saving) {
        $log.debug('Attempted to call contacts-report:$scope.save more than once');
        return;
      }

      telemetryData.preSave = Date.now();
      Telemetry.record(
        `enketo:contacts:${telemetryData.form}:add:user_edit_time`,
        telemetryData.preSave - telemetryData.postRender);

      $scope.enketoStatus.saving = true;
      $scope.enketoStatus.error = null;
      Enketo.save($state.params.formId, $scope.form, geolocation)
        .then(function(docs) {
          $log.debug('saved report and associated docs', docs);
          $scope.enketoStatus.saving = false;
          $translate('report.created').then(Snackbar);
          $scope.enketoStatus.edited = false;
          $state.go('contacts.detail', { id: $state.params.id });
        })
        .then(() => {
          telemetryData.postSave = Date.now();

          Telemetry.record(
            `enketo:contacts:${telemetryData.form}:add:save`,
            telemetryData.postSave - telemetryData.preSave);
        })
        .catch(function(err) {
          $scope.enketoStatus.saving = false;
          $log.error('Error submitting form data: ', err);
          $translate('error.report.save').then(function(msg) {
          $scope.enketoStatus.error = msg;
          });
        });
    };

    $scope.form = null;
    $scope.loadingForm = true;
    $scope.setRightActionBar();
    $scope.setShowContent(true);
    setCancelCallback();
    ContactViewModelGenerator($state.params.id, { merge: true })
      .then(render)
      .catch(function(err) {
        $log.error('Error loading form', err);
        $scope.errorTranslationKey = err.translationKey || 'error.loading.form';
        $scope.contentError = true;
        $scope.loadingForm = false;
      });

    $scope.$on('$destroy', function() {
      unsubscribe();
      if (!$state.includes('contacts.report')) {
        $scope.setTitle();
        Enketo.unload($scope.form);
      }
    });
  }
);
