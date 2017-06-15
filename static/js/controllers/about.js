var _ = require('underscore');

angular.module('inboxControllers').controller('AboutCtrl',
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
    'use strict';
    'ngInject';

    $scope.url = window.location.hostname;
    $scope.userCtx = Session.userCtx();

    DB({remote: true}).allDocs({keys: ['_design/medic']})
      .then(function(info) {
        $scope.ddocVersion = info.rows[0].value.rev.split('-')[0];
      })
      .catch(function(err) {
        $log.debug('Couldnt access _design/medic for about section', err);
        $scope.ddocVersion = 'offline'; // TODO translate?
      });

    DB().allDocs({keys: ['_design/medic-client']})
      .then(function(info) {
        $scope.clientDdocVersion = info.rows[0].value.rev.split('-')[0];
      })
      .catch(function(err) {
        $log.error('Couldnt access _design/medic-client for about section', err);
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

    DB().info().then(function (result) {
      $scope.dbInfo = result;
    }).catch(function (err) {
      $log.error('Failed to fetch DB info', err);
    });

    $scope.help_loading = true;

    var helpPageGet = DB().query('medic-client/help_pages');

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
