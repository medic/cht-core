var nools = require('nools'),
    _ = require('underscore'),
    // number of weeks before reported date to assume for start of pregnancy
    KNOWN_TYPES = ['task', 'target'];

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('RulesEngine',
    function(
      $log,
      $q,
      Changes,
      ContactSchema,
      Search,
      Session,
      Settings,
      UserContact
    ) {

      'ngInject';

      if (Session.isAdmin()) {
        // No-op all rules engine work for admins for now
        return {
          enabled: false,
          init: $q.resolve(),
          listen: function() {}
        };
      }

      var callbacks = {};
      var emissions = {};
      var facts = [];
      var session;
      var err;
      var flow;
      var Contact;

      var nootils = require('../modules/nootils');

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
            return fact.contact && (
              fact.contact._id === factId ||
              fact.contact.patient_id === factId ||
              fact.contact.place_id === factId
            );
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

      var assertFacts = function() {
        KNOWN_TYPES.forEach(function(type) {
          session.on(type, function(fact) {
            notifyCallbacks(fact, type);
          });
        });
        facts.forEach(function(fact) {
          session.assert(fact);
        });
        session.matchUntilHalt().then(
          // halt
          function() {
            notifyError(new Error('Unexpected halt in fact assertion.'));
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

      var updateFacts = function(change) {
        var fact;
        if (change.deleted) {
          fact = findFact(change.id);
          if (fact) {
            if (fact.contact._id === change.id) {
              // deleted contact
              fact.contact.deleted = true;
            } else {
              // deleted report
              _.each(fact.reports, function(report) {
                if (report._id === change.id) {
                  report.deleted = true;
                }
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
          key: 'rules-engine',
          callback: updateFacts,
          filter: function(change) {
            return change.doc.form ||
                   ContactSchema.getTypes().indexOf(change.doc.type) !== -1;
          }
        });
      };

      var initNools = function(settings, user) {
        flow = nools.getFlow('medic');
        if (!flow) {
          flow = nools.compile(settings.tasks.rules, {
            name: 'medic',
            scope: { Utils: nootils(settings), user: user }
          });
        }
        Contact = flow.getDefined('contact');
        session = flow.getSession();
      };

      var init = $q.all([ Settings(), UserContact() ])
        .then(function(results) {
          var settings = results[0];
          var user = results[1];
          if (!settings.tasks || !settings.tasks.rules) {
            // no rules configured
            return $q.resolve();
          }
          if (!flow) {
            initNools(settings, user);
          }
          registerListener();
          var options = {
            limit: 99999999,
            force: true,
            include_docs: true
          };
          return $q.all([
            Search('reports', { valid: true }, options),
            Search('contacts', {}, options)
          ])
            .then(function(results) {
              facts = deriveFacts(results[0], results[1]);
              assertFacts();
            });
        });

      return {
        enabled: true,
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
        _nools: nools // exposed for testing
      };
    }
  );

}());
