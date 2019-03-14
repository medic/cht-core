angular.module('inboxControllers').controller('TasksContentCtrl',
  function (
    $log,
    $ngRedux,
    $scope,
    $state,
    $translate,
    Actions,
    Enketo,
    Geolocation,
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

    var ctrl = this;
    var mapStateToTarget = function(state) {
      return {
        enketoStatus: Selectors.getEnketoStatus(state),
        enketoSaving: Selectors.getEnketoSavingStatus(state),
        selected: Selectors.getSelected(state)
      };
    };
    var mapDispatchToTarget = function(dispatch) {
      var actions = Actions(dispatch);
      return {
        clearCancelCallback: actions.clearCancelCallback,
        setCancelCallback: actions.setCancelCallback,
        setEnketoEditedStatus: actions.setEnketoEditedStatus,
        setEnketoSavingStatus: actions.setEnketoSavingStatus,
        setEnketoError: actions.setEnketoError
      };
    };
    var unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    var geolocation;
    Geolocation()
      .then(function(position) {
        geolocation = position;
      })
      .catch($log.warn);

    var hasOneFormAndNoFields = function(task) {
      return Boolean(
        task &&
        task.actions &&
        task.actions.length === 1 &&
        (
          !task.fields ||
          task.fields.length === 0 ||
          !task.fields[0].value ||
          task.fields[0].value.length === 0
        )
      );
    };

    var markFormEdited = function() {
      ctrl.setEnketoEditedStatus(true);
    };

    $scope.performAction = function(action, skipDetails) {
      ctrl.setCancelCallback(function() {
        if (skipDetails) {
          $state.go('tasks.detail', { id: null });
        } else {
          Enketo.unload($scope.form);
          $scope.form = null;
          $scope.loadingForm = false;
          $scope.contentError = false;
          ctrl.clearCancelCallback();
        }
      });
      $scope.contentError = false;
      if (action.type === 'report') {
        $scope.loadingForm = true;
        $scope.formId = action.form;
        XmlForm(action.form, { include_docs: true })
          .then(function(formDoc) {
            ctrl.setEnketoEditedStatus(false);
            Enketo.render('#task-report', formDoc.id, action.content, markFormEdited)
              .then(function(formInstance) {
                $scope.form = formInstance;
                $scope.loadingForm = false;
                if (formDoc.doc.translation_key) {
                  $scope.setTitle($translate.instant(formDoc.doc.translation_key));
                } else {
                  $scope.setTitle(TranslateFrom(formDoc.doc.title));
                }
              })
              .then(() => {
                telemetryData.postRender = Date.now();
                telemetryData.action = action.content.doc ? 'edit' : 'add';
                telemetryData.form = $scope.formId;

                Telemetry.record(
                  `enketo:tasks:${telemetryData.form}:${telemetryData.action}:render`,
                  telemetryData.postRender - telemetryData.preRender);
              });
          })
          .catch(function(err) {
            $scope.errorTranslationKey = err.translationKey || 'error.loading.form';
            $scope.contentError = true;
            $scope.loadingForm = false;
            $log.error('Error loading form.', err);
          });
      } else if (action.type === 'contact') {
        $state.go('contacts.addChild', action.content);
      }
    };

    $scope.save = function() {
      if (ctrl.enketoSaving) {
        $log.debug('Attempted to call tasks-content:$scope.save more than once');
        return;
      }

      telemetryData.preSave = Date.now();

      Telemetry.record(
        `enketo:tasks:${telemetryData.form}:${telemetryData.action}:user_edit_time`,
        telemetryData.preSave - telemetryData.postRender);

      ctrl.setEnketoSavingStatus(true);
      ctrl.setEnketoError(null);
      Enketo.save($scope.formId, $scope.form, geolocation)
        .then(function(docs) {
          $log.debug('saved report and associated docs', docs);
          $translate('report.created').then(Snackbar);
          ctrl.setEnketoSavingStatus(false);
          ctrl.setEnketoEditedStatus(false);
          Enketo.unload($scope.form);
          $scope.clearSelected();
          ctrl.clearCancelCallback();
          $state.go('tasks.detail', { id: null });
        })
        .then(() => {
          telemetryData.postSave = Date.now();

          Telemetry.record(
            `enketo:tasks:${telemetryData.form}:${telemetryData.action}:save`,
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

    // Wait for `selected` to be set during tasks generation and load the
    // form if we have no other description or instructions in the task.
    $scope.$watch('selected', function() {
      if (hasOneFormAndNoFields(ctrl.selected)) {
        $scope.performAction(ctrl.selected.actions[0], true);
      }
    });

    $scope.form = null;
    $scope.formId = null;
    $scope.setSelected($state.params.id);

    $scope.$on('ClearSelected', () => {
      Enketo.unload($scope.form);
    });

    $scope.$on('$destroy', unsubscribe);
  }
);
