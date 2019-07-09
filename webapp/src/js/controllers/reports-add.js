angular.module('inboxControllers').controller('ReportsAddCtrl',
  function (
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    $translate,
    DB,
    Enketo,
    FileReader,
    Geolocation,
    GetReportContent,
    GlobalActions,
    LineageModelGenerator,
    Selectors,
    Snackbar,
    Telemetry,
    XmlForm
  ) {

    'ngInject';
    'use strict';

    const telemetryData = {
      preRender: Date.now()
    };

    var ctrl = this;
    var mapStateToTarget = function(state) {
      return {
        enketoStatus: Selectors.getEnketoStatus(state),
        enketoSaving: Selectors.getEnketoSavingStatus(state),
        loadingContent: Selectors.getLoadingContent(state),
        selectedReports: Selectors.getSelectedReports(state)
      };
    };
    var mapDispatchToTarget = function(dispatch) {
      var globalActions = GlobalActions(dispatch);
      return {
        clearCancelCallback: globalActions.clearCancelCallback,
        setCancelCallback: globalActions.setCancelCallback,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setEnketoSavingStatus: globalActions.setEnketoSavingStatus,
        setEnketoError: globalActions.setEnketoError,
        setLoadingContent: globalActions.setLoadingContent
      };
    };
    var unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);
    var geolocation;

    var getSelected = function() {
      if ($state.params.formId) { // adding
        Geolocation()
          .then(function(position) {
            geolocation = position;
          })
          .catch($log.warn);

        return $q.resolve({
          formInternalId: $state.params.formId
        });
      }
      if ($state.params.reportId) { // editing
        return LineageModelGenerator.report($state.params.reportId, { merge: true })
          .then(function(result) {
            return {
              doc: result.doc,
              formInternalId: result.doc && result.doc.form
            };
          });
      }
      return $q.reject(new Error('Must have either formId or reportId'));
    };

    ctrl.setLoadingContent(true);
    $scope.contentError = false;
    $scope.saving = false;
    if ($state.params.reportId || $state.params.formId) {
      ctrl.setCancelCallback(function() {
        // Note : if no $state.params.reportId, goes to "No report selected".
        $state.go('reports.detail', { id: $state.params.reportId });
      });
    } else {
      ctrl.clearCancelCallback();
    }

    var markFormEdited = function() {
      ctrl.setEnketoEditedStatus(true);
    };

    getSelected()
      .then(function(model) {
        $log.debug('setting selected', model);
        $scope.setSelected(model);
        return $q.all([
          GetReportContent(model.doc),
          XmlForm(model.formInternalId, { include_docs: true })
        ]).then(function(results) {
          ctrl.setEnketoEditedStatus(false);
          Enketo.render('#report-form', results[1].id, results[0], markFormEdited)
            .then(function(form) {
              $scope.form = form;
              ctrl.setLoadingContent(false);
            })
            .then(function() {
              if (!model.doc || !model.doc._id) {
                return;
              }
              return $q.all($('#report-form input[type=file]')
                .map(function() {
                  var $this = $(this);
                  var attachmentName = 'user-file' + $this.attr('name');

                  return DB().getAttachment(model.doc._id, attachmentName)
                    .then(FileReader.base64)
                    .then(function(base64) {
                      var $picker = $this.closest('.question')
                        .find('.widget.file-picker');

                      $picker.find('.file-feedback').empty();

                      var $preview = $picker.find('.file-preview');
                      $preview.empty();
                      $preview.append('<img src="data:' + base64 + '">');
                    });
                }));
            })
            .then(() => {
              telemetryData.postRender = Date.now();
              telemetryData.action = model.doc ? 'edit' : 'add';
              telemetryData.form = model.formInternalId;

              Telemetry.record(
                `enketo:reports:${telemetryData.form}:${telemetryData.action}:render`,
                telemetryData.postRender - telemetryData.preRender);
            })
            .catch(function(err) {
              ctrl.errorTranslationKey = err.translationKey || 'error.loading.form';
              ctrl.setLoadingContent(false);
              $scope.contentError = true;
              $log.error('Error loading form.', err);
            });
        });
      })
      .catch(function(err) {
        ctrl.setLoadingContent(false);
        $log.error('Error setting selected doc', err);
      });

    $scope.save = function() {
      if (ctrl.enketoSaving) {
        $log.debug('Attempted to call reports-add:$scope.save more than once');
        return;
      }

      telemetryData.preSave = Date.now();

      Telemetry.record(
        `enketo:reports:${telemetryData.form}:${telemetryData.action}:user_edit_time`,
        telemetryData.preSave - telemetryData.postRender);

      ctrl.setEnketoSavingStatus(true);
      ctrl.setEnketoError(null);
      var model = ctrl.selectedReports[0];
      var reportId = model.doc && model.doc._id;
      var formInternalId = model.formInternalId;

      Enketo.save(formInternalId, $scope.form, geolocation, reportId)
        .then(function(docs) {
          $log.debug('saved report and associated docs', docs);
          ctrl.setEnketoSavingStatus(false);
          $translate($state.params.reportId ? 'report.updated' : 'report.created')
            .then(Snackbar);
          ctrl.setEnketoEditedStatus(false);
          $state.go('reports.detail', { id: docs[0]._id });
        })
        .then(() => {
          telemetryData.postSave = Date.now();

          Telemetry.record(
            `enketo:reports:${telemetryData.form}:${telemetryData.action}:save`,
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

    $scope.$on('$destroy', function() {
      unsubscribe();
      if (!$state.includes('reports.add') && !$state.includes('reports.edit')) {
        Enketo.unload($scope.form);
      }
    });
  }
);
