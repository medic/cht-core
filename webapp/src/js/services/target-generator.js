var moment = require('moment'),
    _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('TargetGenerator',
    function(
      $log,
      $parse,
      $q,
      RulesEngine,
      Settings,
      UserContact
    ) {

      'ngInect';

      var targets = [];

      var isRelevant = function(instance) {
        if (!instance.date) {
          $log.warn('Ignoring emitted target with no date - fix your configuration');
          return false;
        }
        if (instance.deleted) {
          return false;
        }
        var start = moment().startOf('month');
        var end = moment().endOf('month');
        var instanceDate = moment(instance.date);
        return instanceDate.isAfter(start) && instanceDate.isBefore(end);
      };

      var calculatePercent = function(pass, total) {
        if (total === 0) {
          return 0;
        }
        return Math.round(pass * 100 / total);
      };

      var calculateValue = function(target) {
        var counts = _.countBy(target.instances, function(instance) {
          return instance.pass ? 'pass' : 'fail';
        });
        _.defaults(counts, { pass: 0, fail: 0 });
        var result = {
          pass: counts.pass,
          total: counts.pass + counts.fail
        };
        if (target.type === 'percent') {
          result.percent = calculatePercent(result.pass, result.total);
        }
        return result;
      };

      var mergeTarget = function(instance) {
        var target = _.findWhere(targets, { id: instance.type });
        if (!target) {
          // unconfigured target type
          return;
        }
        if (isRelevant(instance)) {
          // added or updated - insert into cache
          target.instances[instance._id] = instance;
        } else {
          // deleted or not for this month - remove from the cache
          delete target.instances[instance._id];
        }
        target.value = calculateValue(target);
      };

      var init = $q.all([ Settings(), UserContact() ])
        .then(function(results) {
          var items = results[0].tasks &&
                      results[0].tasks.targets &&
                      results[0].tasks.targets.items;
          var userContact = results[1];
          if (!items) {
            targets = [];
            return;
          }
          targets = items.map(function(item) {
            var result = _.clone(item);
            result.instances = {};
            result.value = calculateValue(result);
            return result;
          }).filter(function(item) {
            if (item.context) {
              // Clone the `userContact` object to prevent bad context
              // expressions from modifying it - this could leak into other
              // expressions.
              var clone = JSON.parse(JSON.stringify(userContact));
              return $parse(item.context)({ user: clone });
            }
            return true;
          });
        });

      return function(callback) {
        init
          .then(function() {
            RulesEngine.listen('TargetGenerator', 'target', function(err, _targets) {
              if (!err) {
                _targets.forEach(mergeTarget);
              }
              callback(err, targets);
            });
          })
          .catch(callback);
      };
    }
  );

}());
