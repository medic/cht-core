(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksContentCtrl', 
    ['$scope', '$state', '$log', '$stateParams', 'Enketo',
    function ($scope, $state, $log, $stateParams, Enketo) {

      $scope.setSelected($stateParams.id);
      $scope.form = null;
      $scope.formId = null;

      $scope.performAction = function(action) {
        if (action.type === 'report') {
          $scope.loadingForm = true;
          $scope.formId = action.form;
          Enketo.render($('#task-report'), action.form, action.content)
            .then(function(form) {
              $scope.form = form;
              $scope.loadingForm = false;
            })
            .catch(function(err) {
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

    }
  ]);

}());
