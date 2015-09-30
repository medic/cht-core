(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksContentCtrl',
    ['$scope', '$state', '$log', '$stateParams', 'Enketo',
    function ($scope, $state, $log, $stateParams, Enketo) {

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

      $scope.performAction = function(action) {
        $scope.contentError = false;
        if (action.type === 'report') {
          $scope.loadingForm = true;
          $scope.formId = action.form;
          Enketo.render($('#task-report'), action.form, action.content)
            .then(function(form) {
              $scope.form = form;
              $scope.loadingForm = false;
            })
            .catch(function(err) {
              $scope.contentError = true;
              $scope.loadingForm = false;
              $log.error('Error loading form.', err);
            });
        }
      };

      $scope.save = function() {
        $scope.saving = true;
        Enketo.save($scope.formId, $scope.form)
          .then(function(doc) {
            $log.debug('saved report', doc);
            $scope.saving = false;
            $state.go('tasks', null, { reload: true });
          })
          .catch(function(err) {
            $scope.saving = false;
            $log.error('Error submitting form data: ', err);
          });
      };

      $scope.$on('$destroy', function() {
        Enketo.unload($scope.form);
      });

      $scope.form = null;
      $scope.formId = null;
      $scope.setSelected($stateParams.id);
      if (hasOneFormAndNoFields($scope.selected)) {
        $scope.performAction($scope.selected.actions[0]);
      }
      $log.info('TasksContentCtrl loaded');

    }
  ]);

}());
