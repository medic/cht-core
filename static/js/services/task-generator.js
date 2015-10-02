var nools = require('nools'),
    _ = require('underscore'),
    noLmpDateModifier = 4;

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('TaskGenerator', ['$q', 'Search', 'Settings',
    function($q, Search, Settings) {

      var getUtils = function(settings) {
        return {
          isTimely: function(date, event) {
            var due = new Date(date);
            var start = this.addDate(null, event.start * -1);
            var end = this.addDate(null, event.end);
            return due.getTime() > start.getTime() && due.getTime() < end.getTime();
          },
          addDate: function(date, days) {
            var result;
            if (date) {
              result = new Date(date.getTime());
            } else {
              result = new Date();
            }
            result.setDate(result.getDate() + days);
            return result;
          },
          getLmpDate: function(doc) {
            var weeks = doc.fields.last_menstrual_period || noLmpDateModifier;
            return this.addDate(new Date(doc.reported_date), weeks * -7);
          },
          getSchedule: function(name) {
            return _.findWhere(settings.tasks.schedules, { name: name });
          }
        };
      };

      var getFlow = function(settings) {
        var flow = nools.getFlow('medic');
        if (flow) {
          return flow;
        }
        var options = {
          name: 'medic',
          scope: { Utils: getUtils(settings) }
        };
        return nools.compile(settings.tasks.rules, options);
      };

      var search = function(scope) {
        return $q(function(resolve, reject) {
          var options = { limit: 99999999 };
          Search(scope, options, function(err, docs) {
            if (err) {
              return reject(err);
            }
            resolve(docs);
          });
        });
      };

      var getContacts = function() {
        return search({
          filterModel: {
            type: 'contacts'
          },
          filterQuery: ''
        });
      };

      var getDataRecords = function() {
        return search({
          filterModel: {
            type: 'reports',
            valid: true,
            forms: [],
            date: {},
            facilities: []
          },
          filterQuery: '',
          forms: [ ]
        });
      };

      var getContactId = function(doc) {
        // get the associated patient or place id to group reports by
        return doc.patient_id || doc.place_id ||
          (doc.fields && (doc.fields.patient_id || doc.fields.place_id));
      };

      var groupReports = function(dataRecords, contacts) {
        var results = _.map(contacts, function(contact) {
          return { contact: contact, reports: [] };
        });
        dataRecords.forEach(function(report) {
          var groupId = getContactId(report);
          var group = _.find(results, function(result) {
            return result.contact && result.contact._id === groupId;
          });
          if (!group) {
            group = { reports: [] };
            results.push(group);
          }
          group.reports.push(report);
        });
        return results;
      };

      var getData = function() {
        return $q.all([ getDataRecords(), getContacts() ])
          .then(function(results) {
            return groupReports(results[0], results[1]);
          });
      };

      var getTasks = function(contacts, settings) {
        var flow = getFlow(settings);
        var Contact = flow.getDefined('contact');
        var session = flow.getSession();
        var tasks = [];
        session.on('task', function(task) {
          tasks.push(task);
        });
        contacts.forEach(function(contact) {
          session.assert(new Contact(contact));
        });
        return session.match().then(function() {
          return tasks;
        });
      };

      var getSettings = function() {
        return $q(function(resolve, reject) {
          Settings(function(err, settings) {
            if (err) {
              return reject(err);
            }
            resolve(settings);
          });
        });
      };

      return function() {
        return getSettings().then(function(settings) {
          if (!settings.tasks ||
              !settings.tasks.rules ||
              !settings.tasks.schedules) {
            // no rules or schedules configured
            return [];
          }
          return getData().then(function(contacts) {
            return getTasks(contacts, settings);
          });
        });
      };
    }
  ]);

}()); 
