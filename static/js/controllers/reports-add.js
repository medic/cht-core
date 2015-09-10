(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsAddCtrl', 
    ['$scope', '$state', 'Enketo',
    function ($scope, $state, Enketo) {
      $scope.loadingContent = true;
      $scope.setSelected({ form: $state.params.id });
      // TODO unload enketo resources on navigate away
      var formWrapper = $('#report-form');
      Enketo.render(formWrapper, $state.params.id)
        .then(function(form) {
          $scope.form = form;
          $scope.loadingContent = false;
          formWrapper.show();
        })
        .catch(function(err) {
          $scope.loadingContent = false;
          console.error('Error loading form.', err);
        });

      $scope.save = function() {
        var $submit = $('#report-form .btn.submit');
        $submit.prop('disabled', true);
        Enketo.save($state.params.id, $scope.form)
          .then(function(doc) {
            $submit.prop('disabled', false);
            $state.go('reports.detail', { id: doc._id });
          })
          .catch(function(err) {
            $submit.prop('disabled', false);
            console.log('Error submitting form data: ', err);
          });
      };
    }
  ]);

}());
