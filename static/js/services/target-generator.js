var moment = require('moment');

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
        var total = Object.keys(target.instances).length;
        if (target.type === 'count') {
          target.count = total;
        } else if (target.type === 'percent') {
          if (total === 0) {
            target.count = 0;
          } else {
            var passes = _.where(target.instances, { pass: true });
            target.count = Math.round(passes.length * 100 / total);
          }
        }
      };

      var init = Settings()
        .then(function(settings) {
          targets = settings.tasks.targets.items;
        });

      return function(callback) {
        init
          .then(function() {
            TaskGenerator('TargetGenerator', 'target', function(err, _targets) {
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
