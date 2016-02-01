'use strict';

var inboxControllers = angular.module('inboxControllers');

inboxControllers.controller('HelpCtrl',
  ['$scope', '$stateParams', '$q', 'DB', 'Markdown', 'UserSettings',
  function ($scope, $stateParams, $q, DB, Markdown, UserSettings) {
    $scope.filterModel.type = 'help';
    $scope.loading = true;

    var docId = 'help:' + $stateParams.page;

    DB.get().get(docId)
      .then(function(doc) {
        new $q(function(resolve) {
          UserSettings(function(err, settings) {
            if(err || !settings) {
              resolve('en');
            }
            resolve(settings.language || 'en');
          });
        })
        .then(function(lang) {
          $scope.loading = false;
          $scope.title = doc.title[lang] || doc.title.en;
          $scope.body = Markdown.basic(doc.body[lang] || doc.body.en);
        });
      });
  }
]);
