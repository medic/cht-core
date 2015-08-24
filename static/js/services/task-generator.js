var nools = require('nools'),
    noLmpDateModifier = 4;

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('TaskGenerator', ['$q', 'Search', 'Settings',
    function($q, Search, Settings) {

      var Utils = {
        addDate: function(date, days) {
          var result = new Date(date.getTime());
          result.setDate(result.getDate() + days);
          return result;
        }
      };

      var getFlow = function(settings) {
        var flow = nools.getFlow('medic');
        if (flow) {
          return flow;
        }
        var options = {
          name: 'medic',
          scope: {
            schedules: settings.tasks.schedules,
            Utils: Utils
          }
        };
        return nools.compile(settings.tasks.rules, options);
      };

      var getLmpDate = function(doc) {
        var weeks = doc.fields.last_menstrual_period || noLmpDateModifier;
        return Utils.addDate(new Date(doc.reported_date), weeks * -7);
      };

      var getDataRecords = function(callback) {
        var scope = {
          filterModel: {
            type: 'reports',
            valid: true,
            forms: [],
            date: {},
            facilities: []
          },
          filterQuery: '',
          forms: [ ]
        };
        var options = { limit: 99999999 };
        Search(scope, options, callback);
      };

      var getTasks = function(dataRecords, settings, callback) {
        var flow = getFlow(settings);
        var Registration = flow.getDefined('registration');
        var session = flow.getSession();
        var tasks = [];
        session.on('task', function(task) {
          tasks.push(task);
        });
        dataRecords.forEach(function(doc) {
          if (doc.form === settings.anc_forms.registration ||
              doc.form === settings.anc_forms.registrationLmp) {
            session.assert(new Registration({
              doc: doc,
              lmpDate: getLmpDate(doc)
            }));
          }
        });
        return session.match().then(
          function() {
            callback(null, tasks);
          },
          callback
        );
      };

      return function() {
        var deferred = $q.defer();
        Settings(function(err, settings) {
          if (err) {
            return deferred.reject(err);
          }
          if (!settings.tasks ||
              !settings.tasks.rules ||
              !settings.tasks.schedules) {
            // no rules or schedules configured
            return deferred.resolve([]);
          }
          getDataRecords(function(err, dataRecords) {
            if (err) {
              return deferred.reject(err);
            }
            getTasks(dataRecords, settings, function(err, tasks) {
              if (err) {
                return deferred.reject(err);
              }
              deferred.resolve(tasks);
            });
          });
        });
        return deferred.promise;
      };
    }
  ]);

}()); 
