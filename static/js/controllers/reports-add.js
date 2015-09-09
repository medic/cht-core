(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsAddCtrl', 
    ['$scope', '$state', 'Enketo',
    function ($scope, $state, Enketo) {
      $scope.setSelected({ form: $state.params.id });
      // TODO unload enketo resources on navigate away
      // TODO angularify this
      var formWrapper = $('#report-form');
      Enketo.render(formWrapper, $state.params.id)
        .then(function(form) {
          $scope.form = form;
          formWrapper.show();
        })
        .catch(function(err) {
          return console.error('Error loading form.', err);
        });

    }
  ]);

}());
