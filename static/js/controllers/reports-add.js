(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsAddCtrl', 
    ['$log', '$scope', '$state', '$q', '$translate', 'DB', 'Enketo', 'Snackbar',
    function ($log, $scope, $state, $q, $translate, DB, Enketo, Snackbar) {

      var getSelected = function() {
        if ($state.params.formId) { // adding
          return $q.resolve({ form: $state.params.formId });
        }
        if ($state.params.reportId) { // editing
          return DB.get().get($state.params.reportId);
        }
        return $q.reject(new Error('Must have either formId or reportId'));
      };

      $scope.loadingContent = true;
      $scope.contentError = false;
      $scope.saving = false;
      if($state.params.reportId) {
        $scope.setBackTarget('reports.detail', $state.params.reportId);
      } else {
        $scope.clearBackTarget();
      }

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
              $scope.contentError = true;
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
            $translate($state.params.reportId ? 'report.updated' : 'report.created')
              .then(Snackbar);
            $state.go('reports.detail', { id: doc._id });
          })
          .catch(function(err) {
            $scope.$apply('saving = false');
            $log.error('Error submitting form data: ', err);
          });
      };

      $scope.$on('$destroy', function() {
        Enketo.unload($scope.form);
      });
    }
  ]);

}());
