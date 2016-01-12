(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('HelpCtrl',
    ['$scope', '$stateParams', 'DB', 'Markdown',
    function ($scope, $stateParams, DB, Markdown) {
      $scope.filterModel.type = 'help';
      $scope.loading = true;

      var docId = 'help:' + $stateParams.page;

      DB.get().get(docId)
        .then(function(doc) {
          $scope.loading = false;
          // TODO this should not be hardcoded to english!
          $scope.title = doc.title['en'];
          $scope.body = Markdown.basic(doc.body['en']);
        });
    }
  ]);

}());
