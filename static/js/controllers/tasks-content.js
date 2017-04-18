angular.module('inboxControllers').controller('TasksContentCtrl',
  function (
    $log,
    $scope,
    $state,
    $translate,
    DB,
    Enketo,
    TranslateFrom,
    Snackbar,
    XmlForm
  ) {

    'use strict';
    'ngInject';

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

    $scope.performAction = function(action, skipDetails) {
      $scope.setCancelTarget(function() {
        if (skipDetails) {
          $state.go('tasks.detail', { id: null });
        } else {
          Enketo.unload($scope.form);
          $scope.form = null;
          $scope.loadingForm = false;
          $scope.contentError = false;
          $scope.clearCancelTarget();
        }
      });
      $scope.contentError = false;
      if (action.type === 'report') {
        $scope.loadingForm = true;
        $scope.formId = action.form;
        XmlForm(action.form, { include_docs: true })
          .then(function(formDoc) {
            Enketo.render('#task-report', formDoc.id, action.content)
              .then(function(formInstance) {
                $scope.form = formInstance;
                $scope.loadingForm = false;
                $scope.setTitle(TranslateFrom(formDoc.doc.title));
              });
          })
          .catch(function(err) {
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

      $scope.enketoStatus.saving = true;
      $scope.enketoStatus.error = null;
      Enketo.save($scope.formId, $scope.form)
        .then(function(doc) {
          $log.debug('saved report', doc);
          $translate('report.created').then(Snackbar);
          $scope.enketoStatus.saving = false;
          Enketo.unload($scope.form);
          $scope.clearSelected();
          $scope.clearCancelTarget();
          $state.go('tasks.detail', { id: null });
        })
        .catch(function(err) {
          $scope.enketoStatus.saving = false;
          $log.error('Error submitting form data: ', err);
          $translate('error.report.save').then(function(msg) {
            $scope.enketoStatus.error = msg;
          });
        });
    };

    $scope.$on('$stateChangeStart', function(event, toState) {
      if (toState.name.indexOf('tasks.detail') === -1) {
        Enketo.unload($scope.form);
        $scope.unsetSelected();
      }
    });

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
  }
);
