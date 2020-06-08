angular.module('inboxControllers').controller('TrainingsAddCtrl',
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
    GetTrainingContent,
    GlobalActions,
    LineageModelGenerator,
    Selectors,
    Snackbar,
    Telemetry,
    TrainingsActions,
    XmlForms
  ) {

    'ngInject';
    'use strict';

    const telemetryData = {
      preRender: Date.now()
    };

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        enketoStatus: Selectors.getEnketoStatus(state),
        enketoSaving: Selectors.getEnketoSavingStatus(state),
        loadingContent: Selectors.getLoadingContent(state),
        selectedTrainings: Selectors.getSelectedTrainings(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const trainingsActions = TrainingsActions(dispatch);
      return {
        clearCancelCallback: globalActions.clearCancelCallback,
        navigationCancel: globalActions.navigationCancel,
        setCancelCallback: globalActions.setCancelCallback,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setEnketoSavingStatus: globalActions.setEnketoSavingStatus,
        setEnketoError: globalActions.setEnketoError,
        setLoadingContent: globalActions.setLoadingContent,
        setSelected: trainingsActions.setSelected
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);
    let geolocation;

    const getSelected = function() {
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
      if ($state.params.trainingId) { // editing
        return LineageModelGenerator.training($state.params.trainingId)
          .then(function(result) {
            return {
              doc: result.doc,
              formInternalId: result.doc && result.doc.form
            };
          });
      }
      return $q.reject(new Error('Must have either formId or trainingId'));
    };

    ctrl.setLoadingContent(true);
    ctrl.contentError = false;
    if ($state.params.trainingId || $state.params.formId) {
      ctrl.setCancelCallback(function() {
        // Note : if no $state.params.trainingId, goes to "No training selected".
        $state.go('trainings.detail', { id: $state.params.trainingId });
      });
    } else {
      ctrl.clearCancelCallback();
    }

    const markFormEdited = function() {
      ctrl.setEnketoEditedStatus(true);
    };

    getSelected()
      .then(function(model) {
        $log.debug('setting selected', model);
        ctrl.setSelected(model);
        ctrl.setLoadingContent(true);
        return $q.all([
          GetTrainingContent(model.doc),
          XmlForms.get(model.formInternalId)
        ]).then(function(results) {
          ctrl.setEnketoEditedStatus(false);
          Enketo.render('#training-form', results[1], results[0], markFormEdited)
            .then(function(form) {
              ctrl.form = form;
              ctrl.setLoadingContent(false);
            })
            .then(function() {
              if (!model.doc || !model.doc._id) {
                return;
              }
              return $q.all($('#training-form input[type=file]')
                .map(function() {
                  const $this = $(this);
                  const attachmentName = 'user-file' + $this.attr('name');

                  return DB().getAttachment(model.doc._id, attachmentName)
                    .then(FileReader.base64)
                    .then(function(base64) {
                      const $picker = $this.closest('.question')
                        .find('.widget.file-picker');

                      $picker.find('.file-feedback').empty();

                      const $preview = $picker.find('.file-preview');
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
                `enketo:trainings:${telemetryData.form}:${telemetryData.action}:render`,
                telemetryData.postRender - telemetryData.preRender);
            })
            .catch(function(err) {
              ctrl.errorTranslationKey = err.translationKey || 'error.loading.form';
              ctrl.setLoadingContent(false);
              ctrl.contentError = true;
              $log.error('Error loading form.', err);
            });
        });
      })
      .catch(function(err) {
        ctrl.setLoadingContent(false);
        $log.error('Error setting selected doc', err);
      });

    ctrl.save = function() {
      if (ctrl.enketoSaving) {
        $log.debug('Attempted to call trainings-add:$scope.save more than once');
        return;
      }

      telemetryData.preSave = Date.now();

      Telemetry.record(
        `enketo:trainings:${telemetryData.form}:${telemetryData.action}:user_edit_time`,
        telemetryData.preSave - telemetryData.postRender);

      ctrl.setEnketoSavingStatus(true);
      ctrl.setEnketoError(null);
      const model = ctrl.selectedTrainings[0];
      const trainingId = model.doc && model.doc._id;
      const formInternalId = model.formInternalId;

      Enketo.save(formInternalId, ctrl.form, geolocation, trainingId)
        .then(function(docs) {
          $log.debug('saved training and associated docs', docs);
          ctrl.setEnketoSavingStatus(false);
          $translate($state.params.trainingId ? 'training.updated' : 'training.created')
            .then(Snackbar);
          ctrl.setEnketoEditedStatus(false);
          $state.go('trainings.detail', { id: docs[0]._id });
        })
        .then(() => {
          telemetryData.postSave = Date.now();

          Telemetry.record(
            `enketo:trainings:${telemetryData.form}:${telemetryData.action}:save`,
            telemetryData.postSave - telemetryData.preSave);
        })
        .catch(function(err) {
          ctrl.setEnketoSavingStatus(false);
          $log.error('Error submitting form data: ', err);
          $translate('error.training.save').then(function(msg) {
            ctrl.setEnketoError(msg);
          });
        });
    };

    $scope.$on('$destroy', function() {
      unsubscribe();
      if (!$state.includes('trainings.add') && !$state.includes('trainings.edit')) {
        Enketo.unload(ctrl.form);
      }
    });
  }
);
