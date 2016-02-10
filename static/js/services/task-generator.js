var nools = require('nools'),
    _ = require('underscore'),
    // number of weeks before reported date to assume for start of pregnancy
    noLmpDateModifier = 4,
    knownTypes = ['task', 'target'];

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('TaskGenerator', ['$q', '$log', 'DB', 'Search', 'Settings', 'Changes',
    function($q, $log, DB, Search, Settings, Changes) {

      var contactTypes = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
      var callbacks = {};
      var emissions = {};
      var facts = [];
      var session;
      var err;
      var flow;
      var Contact;

      var getUtils = function(settings) {
        return {
          isTimely: function(date, event) {
            var due = new Date(date);
            var start = this.addDate(null, event.start);
            var end = this.addDate(null, event.end * -1);
            return due.getTime() < start.getTime() && due.getTime() > end.getTime();
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

      var search = function(scope) {
        var deferred = $q.defer();
        var options = { limit: 99999999, force: true };
        Search(scope, options, function(err, docs) {
          if (err) {
            return deferred.reject(err);
          }
          deferred.resolve(docs);
        });
        return deferred.promise;
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

      var deriveFacts = function(dataRecords, contacts) {
        var facts = _.map(contacts, function(contact) {
          return new Contact({ contact: contact, reports: [] });
        });
        dataRecords.forEach(function(report) {
          var factId = getContactId(report);
          var fact = _.find(facts, function(fact) {
            return fact.contact && fact.contact._id === factId;
          });
          if (!fact) {
            fact = new Contact({ reports: [] });
            facts.push(fact);
          }
          fact.reports.push(report);
        });
        return facts;
      };

      var notifyError = function(_err) {
        err = _err;
        _.values(callbacks).forEach(function(cbs) {
          _.values(cbs).forEach(function(callback) {
            callback(err);
          });
        });
      };

      var notifyCallbacks = function(fact, type) {
        if (!emissions[type]) {
          emissions[type] = {};
        }
        emissions[type][fact._id] = fact;
        _.values(callbacks[type]).forEach(function(callback) {
          callback(null, [ fact ]);
        });
      };

      var getTasks = function() {
        knownTypes.forEach(function(type) {
          session.on(type, function(task) {
            notifyCallbacks(task, type);
          });
        });
        facts.forEach(function(fact) {
          session.assert(fact);
        });
        session.matchUntilHalt().then(
          // halt
          function() {
            notifyError(new Error('Unexpected halt in task generation rules.'));
          },
          // error
          notifyError
        );
      };

      var findFact = function(id) {
        return _.find(facts, function(fact) {
          return fact.contact && fact.contact._id === id ||
                 _.findWhere(fact.reports, { _id: id });
        });
      };

      var updateReport = function(doc) {
        for (var j = 0; j < facts.length; j++) {
          var fact = facts[j];
          for (var i = 0; i < fact.reports.length; i++) {
            if (fact.reports[i]._id === doc._id) {
              fact.reports[i] = doc;
              return fact;
            }
          }
        }
      };

      var updateTasks = function(change) {
        var fact;
        if (change.deleted) {
          fact = findFact(change.id);
          if (fact) {
            if (fact.contact._id === change.id) {
              fact.contact = null;
            } else {
              fact.reports = _.reject(fact.reports, function(report) {
                return report._id === change.id;
              });
            }
            session.modify(fact);
          }
        } else if (change.newDoc) {
          if (change.newDoc.form) {
            // new report
            fact = findFact(getContactId(change.newDoc));
            if (fact) {
              fact.reports.push(change.newDoc);
              session.modify(fact);
            } else {
              // new report for unknown contact
              session.assert(new Contact({ reports: [ change.newDoc ] }));
            }
          } else {
            // new contact
            session.assert(new Contact({ contact: change.newDoc, reports: [] }));
          }
        } else {
          DB.get().get(change.id)
            .then(function(doc) {
              if (doc.form) {
                // updated report
                fact = updateReport(doc);
              } else {
                // updated contact
                fact = findFact(change.id);
                fact.contact = doc;
              }
              if (fact) {
                session.modify(fact);
              }
            })
            .catch(notifyError);
        }
      };

      var registerListener = function() {
        Changes({
          key: 'task-generator',
          callback: updateTasks,
          filter: function(change) {
            if (change.newDoc) {
              return change.newDoc.form ||
                     contactTypes.indexOf(change.newDoc.type) !== -1;
            }
            return !!findFact(change.id);
          }
        });
      };

      var initNools = function(settings) {
        flow = nools.getFlow('medic');
        if (!flow) {
          flow = nools.compile(settings.tasks.rules, {
            name: 'medic',
            scope: { Utils: getUtils(settings) }
          });
        }
        Contact = flow.getDefined('contact');
        session = flow.getSession();
      };

      var init = Settings()
        .then(function(settings) {
          if (!settings.tasks || !settings.tasks.rules) {
            // no rules configured
            return $q.resolve;
          }
          if (!flow) {
            initNools(settings);
          }
          registerListener();
          return $q.all([ getDataRecords(), getContacts() ])
            .then(function(results) {
              facts = deriveFacts(results[0], results[1]);
              getTasks();
            });
        });

      return function(name, type, callback) {
        if (!callbacks[type]) {
          callbacks[type] = {};
        }
        callbacks[type][name] = callback;
        init
          .then(function() {
            // wait for init to complete
            callback(err, _.values(emissions[type]));
          })
          .catch(callback);
      };
    }
  ]);

}()); 
