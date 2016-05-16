var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AboutCtrl',
    function (
      $interval,
      $q,
      $log,
      $scope,
      DB,
      Debug,
      Language,
      Session
    ) {
      'ngInject';

      $scope.url = window.location.hostname;
      $scope.userCtx = Session.userCtx();
      DB.get().get('_design/medic')
        .then(function(ddoc) {
          var rev = ddoc.remote_rev || ddoc._rev;
          $scope.ddocVersion = rev.split('-')[0];
        });
      $scope.reload = function() {
        window.location.reload(false);
      };
      $scope.enableDebugModel = {
        val: Debug.get()
      };
      $scope.$watch('enableDebugModel.val', Debug.set);

      if (window.medicmobile_android && window.medicmobile_android.getDataUsage) {
        $scope.androidDataUsage = JSON.parse(window.medicmobile_android.getDataUsage());

        var dataUsageUpdate = $interval(function() {
          $scope.androidDataUsage = JSON.parse(window.medicmobile_android.getDataUsage());
        }, 2000);

        $scope.$on('$destroy', function() {
          $interval.cancel(dataUsageUpdate);
        });
      }

      DB.get().info().then(function (result) {
        $scope.dbInfo = JSON.stringify(result, null, 2);
      }).catch(function (err) {
        $log.error('Failed to fetch DB info', err);
      });

      $scope.help_loading = true;

      var helpPageGet = DB.get().query('medic/help_pages');

      $q.all([ helpPageGet, Language() ])
        .then(function(results) {
          var helpPageRes = results[0];
          var lang = results[1];
          $scope.help_loading = false;
          $scope.help_pages = _.map(helpPageRes.rows, function(row) {
            return { id: row.key, title: row.value[lang] || row.value.en };
          });
        });
    }
  );
}());