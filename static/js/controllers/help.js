'use strict';

var inboxControllers = angular.module('inboxControllers');

inboxControllers.controller('HelpCtrl',
  ['$scope', '$stateParams', '$q', 'DB', 'Language', 'Markdown',
  function ($scope, $stateParams, $q, DB, Language, Markdown) {
    $scope.filterModel.type = 'help';
    $scope.loading = true;

    var docId = 'help:' + $stateParams.page;
    var docGet = DB.get().get(docId);

    $q.all([ docGet, Language() ])
      .then(function(results) {
        var doc = results[0];
        var lang = results[1];
        $scope.loading = false;
        $scope.title = doc.title[lang] || doc.title.en;
        $scope.body = Markdown.basic(doc.body[lang] || doc.body.en);
      });
  }
]);
