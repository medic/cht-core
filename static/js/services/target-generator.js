var moment = require('moment'),
    _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('TargetGenerator', ['$q', '$log', 'Settings', 'TaskGenerator',
    function($q, $log, Settings, TaskGenerator) {

      var targets = [];

      var isRelevant = function(instance) {
        if (!instance.date) {
          $log.info('Ignoring emitted target with no date - fix your configuration');
          return false;
        }
        var start = moment().startOf('month');
        var end = moment().endOf('month');
        var instanceDate = moment(instance.date);
        return instanceDate.isAfter(start) && instanceDate.isBefore(end);
      };

      var calculateCount = function(target) {
        var counts = _.countBy(target.instances, function(instance) {
          return instance.pass ? 'pass' : 'fail';
        });
        if (target.type === 'count') {
          return counts.pass;
        }
        if (target.type === 'percent') {
          var total = (counts.pass || 0) + (counts.fail || 0);
          if (total === 0) {
            return 0;
          }
          return Math.round(counts.pass * 100 / total);
        }
      };

      var mergeTarget = function(instance) {
        var target = _.findWhere(targets, { id: instance.type });
        if (!target) {
          // unconfigured target type
          return;
        }
        if (!target.instances) {
          target.instances = {};
        }
        if (isRelevant(instance)) {
          target.instances[instance._id] = instance;
        }
        target.count = calculateCount(target);
      };

      var init = Settings()
        .then(function(settings) {
          targets = settings.tasks.targets.items;
        });

      return function(callback) {
        init
          .then(function() {
            TaskGenerator.listen('TargetGenerator', 'target', function(err, _targets) {
              if (!err) {
                _targets.forEach(mergeTarget);
              }
              callback(err, targets);
            });
          })
          .catch(callback);
      };
    }
  ]);

}()); 
