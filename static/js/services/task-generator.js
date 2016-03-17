var nools = require('nools'),
    _ = require('underscore'),
    // number of weeks before reported date to assume for start of pregnancy
    noLmpDateModifier = 4,
    knownTypes = ['task', 'target'];

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('TaskGenerator', ['$q', '$log', 'Search', 'Settings', 'Changes', 'CONTACT_TYPES',
    function($q, $log, Search, Settings, Changes, CONTACT_TYPES) {

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

      var search = function(type, filters) {
        var deferred = $q.defer();
        var options = { limit: 99999999, force: true };
        Search(type, filters, options, function(err, docs) {
          if (err) {
            return deferred.reject(err);
          }
          deferred.resolve(docs);
        });
        return deferred.promise;
      };

      var getContacts = function() {
        return search('contacts', {});
      };

      var getDataRecords = function() {
        return search('reports', { valid: true });
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
              // deleted contact
              fact.contact = null;
            } else {
              // deleted report
              fact.reports = _.reject(fact.reports, function(report) {
                return report._id === change.id;
              });
            }
            session.modify(fact);
          }
        } else if (change.doc.form) {
          fact = updateReport(change.doc);
          if (fact) {
            // updated report
            session.modify(fact);
          } else {
            fact = findFact(getContactId(change.doc));
            if (fact) {
              // new report for known contact
              fact.reports.push(change.doc);
              session.modify(fact);
            } else {
              // new report for unknown contact
              fact = new Contact({ reports: [ change.doc ] });
              facts.push(fact);
              session.assert(fact);
            }
          }
        } else {
          fact = findFact(change.id);
          if (fact) {
            // updated contact
            fact.contact = change.doc;
            session.modify(fact);
          } else {
            // new contact
            fact = new Contact({ contact: change.doc, reports: [] });
            facts.push(fact);
            session.assert(fact);
          }
        }
      };

      var registerListener = function() {
        Changes({
          key: 'task-generator',
          callback: updateTasks,
          filter: function(change) {
            return change.doc.form ||
                   CONTACT_TYPES.indexOf(change.doc.type) !== -1;
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

      return {
        init: init,
        listen: function(name, type, callback) {
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
        },
      };
    }
  ]);

}()); 
