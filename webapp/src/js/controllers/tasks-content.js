angular.module('inboxControllers').controller('TasksContentCtrl',
  function (
    $log,
    $ngRedux,
    $scope,
    $state,
    $translate,
    Actions,
    DB,
    Enketo,
    Geolocation,
    Telemetry,
    TranslateFrom,
    Snackbar,
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
      $scope.enketoStatus.edited = true;
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
            $scope.enketoStatus.edited = false;
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
      if ($scope.enketoStatus.saving) {
        $log.debug('Attempted to call tasks-content:$scope.save more than once');
        return;
      }

      telemetryData.preSave = Date.now();

      Telemetry.record(
        `enketo:tasks:${telemetryData.form}:${telemetryData.action}:user_edit_time`,
        telemetryData.preSave - telemetryData.postRender);

      $scope.enketoStatus.saving = true;
      $scope.enketoStatus.error = null;
      Enketo.save($scope.formId, $scope.form, geolocation)
        .then(function(docs) {
          $log.debug('saved report and associated docs', docs);
          $translate('report.created').then(Snackbar);
          $scope.enketoStatus.saving = false;
          Enketo.unload($scope.form);
          $scope.clearSelected();
          ctrl.clearCancelCallback();
          $scope.enketoStatus.edited = false;
          $state.go('tasks.detail', { id: null });
        })
        .then(() => {
          telemetryData.postSave = Date.now();

          Telemetry.record(
            `enketo:tasks:${telemetryData.form}:${telemetryData.action}:save`,
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

    // Wait for `selected` to be set during tasks generation and load the
    // form if we have no other description or instructions in the task.
    $scope.$watch('selected', function() {
      if (hasOneFormAndNoFields($scope.selected)) {
        $scope.performAction($scope.selected.actions[0], true);
      }
    });

    $scope.form = null;
    $scope.formId = null;
    $scope.setSelected($state.params.id);

    $scope.$on('$destroy', unsubscribe);
  }
);
