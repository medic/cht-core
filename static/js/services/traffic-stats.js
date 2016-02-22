(function() {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('TrafficStats', [ 'DB', '$log', 'Session',
    function(DB, $log, Session) {
      var log = function() {
        var stats = JSON.parse(window.medicmobile_android.getDataUsage());
        stats.timestamp = Date.now();

        DB.get().query('medic/traffic_stats').then(function(res) {
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
            return DB.get().post(doc);
          }
          doc = res.rows[0].value;
          doc.traffic.push(stats);
          return DB.get().put(doc);
        }).then(function(response) {
          $log.debug('Saved trafficstats', stats, response);
        }).catch(function(err) {
          $log.error('Could not save traffic stats.', err);
        });
      };


      return function() {
        if (!window.medicmobile_android || !window.medicmobile_android.getDataUsage) {
          $log.info('Not on android, or no traffic monitoring available. No traffic stats will be logged.');
          return;
        }
        log();
      };
    }
  ]);

}());