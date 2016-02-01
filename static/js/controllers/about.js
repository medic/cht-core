'use strict';

var inboxControllers = angular.module('inboxControllers');

inboxControllers.controller('AboutCtrl',
  ['$scope', '$q', 'Session', 'Debug', 'DB', 'UserSettings',
  function ($scope, $q, Session, Debug, DB, UserSettings) {
    $scope.filterModel.type = 'help';
    $scope.url = window.location.hostname;
    $scope.userCtx = Session.userCtx();
    $scope.reload = function() {
      window.location.reload(false);
    };
    $scope.enableDebugModel = {
      val: Debug.get()
    };
    $scope.$watch('enableDebugModel.val', Debug.set);

    DB.get().info().then(function (result) {
      $scope.dbInfo = JSON.stringify(result, null, 2);
    }).catch(function (err) {
      console.error('Failed to fetch DB info', err);
    });

    $scope.help_loading = true;
    DB.get()
      .query('medic/help_pages')
      .then(function(res) {
        new $q(function(resolve) {
          UserSettings(function(err, settings) {
            if(err || !settings) {
              resolve('en');
            }
            resolve(settings.language || 'en');
          });
        })
        .then(function(lang) {
          $scope.help_loading = false;
          $scope.help_pages = _.map(res.rows, function(row) {
            return { id: row.key, title: row.value[lang] || row.value.en };
          });
        });
      });
  }
]);
