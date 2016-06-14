(function() {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('TrafficStats', ['DB', 'Debug', '$interval', '$log', 'Session', '$window',
    function(DB, Debug, $interval, $log, Session, $window) {
      var parentScope;
      var log = function() {
        var stats = JSON.parse($window.medicmobile_android.getDataUsage());
        stats.timestamp = Date.now();

        DB()
          .query('medic/doc_by_type', { key: [ 'traffic_stats' ], include_docs: true })
          .then(function(res) {
            var doc;
            if (res.rows.length > 1) {
              throw new Error('Should have single traffic_stats doc per user');
            }
            if (res.rows.length === 0) {
              // No traffic_stats doc yet. Make one.
              doc = {
                type: 'traffic_stats',
                user: Session.userCtx().name,
                traffic: [stats]
              };
              return DB().post(doc);
            }
            doc = res.rows[0].doc;
            doc.traffic.push(stats);
            return DB().put(doc);
          })
          .then(function(response) {
            $log.debug('Saved traffic_stats', stats, response);
          })
          .catch(function(err) {
            $log.error('Error saving traffic_stats.', err);
          });
      };


      return function(scope) {
        if (!$window.medicmobile_android || !$window.medicmobile_android.getDataUsage) {
          $log.info('Not on android, or no traffic monitoring available. No traffic stats will be logged.');
          return;
        }
        log();

        if (Debug.get()) {
          parentScope = scope;
          var dataUsageUpdate = $interval(function() {
            $log.debug('TrafficStats', Date.now(), window.medicmobile_android.getDataUsage());
          }, 10000);

          parentScope.$on('$destroy', function() {
            $interval.cancel(dataUsageUpdate);
          });

        }
      };
    }
  ]);

}());