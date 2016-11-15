(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksContentCtrl',
    ['$log', '$scope', '$state', '$translate', 'DB', 'Enketo', 'TranslateFrom', 'Snackbar',
    function ($log, $scope, $state, $translate, DB, Enketo, TranslateFrom, Snackbar) {

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
          Enketo.render($('#task-report'), action.form, action.content)
            .then(function(form) {
              $scope.form = form;
              $scope.loadingForm = false;
            })
            .then(function() {
              return DB().query('medic-client/forms', { include_docs: true, key: action.form });
            })
            .then(function(res) {
              if (res.rows[0]) {
                $scope.setTitle(TranslateFrom(res.rows[0].doc.title));
              }
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
        if ($scope.saving) {
          $log.debug('Attempted to call tasks-content:$scope.save more than once');
          return;
        }

        $scope.saving = true;
        Enketo.save($scope.formId, $scope.form)
          .then(function(doc) {
            $log.debug('saved report', doc);
            $translate('report.created').then(Snackbar);
            $scope.saving = false;
            Enketo.unload($scope.form);
            $scope.clearSelected();
            $scope.clearCancelTarget();
            $state.go('tasks.detail', { id: null });
          })
          .catch(function(err) {
            $scope.saving = false;
            $log.error('Error submitting form data: ', err);
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
  ]);

}());
