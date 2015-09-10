(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsAddCtrl', 
    ['$scope', '$state', '$log', 'DB', 'Enketo',
    function ($scope, $state, $log, DB, Enketo) {

      var getSelected = function() {
        if ($state.params.formId) { // adding
          return Promise.resolve({ form: $state.params.formId });
        }
        if ($state.params.reportId) { // editing
          return DB.get().get($state.params.reportId);
        }
        return Promise.reject(new Error('Must have either formId or reportId'));
      };

      $scope.loadingContent = true;
      $scope.saving = false;

      getSelected()
        .then(function(doc) {
          $log.debug('setting selected', doc);
          $scope.setSelected(doc);
          Enketo.render($('#report-form'), doc.form, doc.content)
            .then(function(form) {
              $scope.form = form;
              $scope.loadingContent = false;
            })
            .catch(function(err) {
              $scope.loadingContent = false;
              $log.error('Error loading form.', err);
            });
        })
        .catch(function(err) {
          $scope.loadingContent = false;
          $log.error('Error setting selected doc', err);
        });

      $scope.save = function() {
        $scope.saving = true;
        // TODO pass doc here
        Enketo.save($scope.selected.form, $scope.form, $scope.selected._id)
          .then(function(doc) {
            $log.debug('saved report', doc);
            $scope.saving = false;
            $state.go('reports.detail', { id: doc._id });
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
