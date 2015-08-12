var nools = require('nools'),
    _ = require('underscore');

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  /* jshint quotmark: false */
  var rules =
    "define Registration {" +
    "  lmpDate: null," +
    "  doc: null" +
    "}" +
    "" +
    "define Visit {" +
    "  _id: null," +
    "  date: null," +
    "  title: null," +
    "  description: null," +
    "  registration: null" +
    "}" +
    "" +
    "rule GenerateEvents {" +
    "  when {" +
    "    r: Registration" +
    "  }" +
    "  then {" +
    "    schedule.forEach(function(s) {" +
    "      var visit = new Visit({" +
    "        _id: r.doc._id + '-' + s.id," +
    "        date: addDate(r.lmpDate, s.days)," +
    "        title: createTitle(s, r.doc)," +
    "        description: createDescription(s, r.doc)," +
    "        registration: r.doc" +
    "      });" +
    "      emit('visit', visit);" +
    "      assert(visit);" +
    "    });" +
    "  }" +
    "}";

  var schedule = [
    {
      id: 1,
      days: 50,
      title: _.template('ANC visit #{{schedule.id}} for {{doc.fields.patient_name}}'),
      description: _.template('Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #{{schedule.id}}.')
    },
    {
      id: 2,
      days: 100,
      title: _.template('ANC visit #{{schedule.id}} for {{doc.fields.patient_name}}'),
      description: _.template('Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #{{schedule.id}}.')
    },
    {
      id: 3,
      days: 150,
      title: _.template('ANC visit #{{schedule.id}} for {{doc.fields.patient_name}}'),
      description: _.template('Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #{{schedule.id}}. Remember to check for danger signs!')
    },
    {
      id: 4,
      days: 200,
      title: _.template('ANC visit #{{schedule.id}} for {{doc.fields.patient_name}}'),
      description: _.template('Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #{{schedule.id}}. Remember to check for danger signs!')
    }
  ];

  var addDate = function(lmp, days) {
    var result = new Date(lmp.getTime());
    result.setDate(result.getDate() + days);
    return result;
  };

  var createTitle = function(schedule, doc) {
    return schedule.title({ schedule: schedule, doc: doc });
  };

  var createDescription = function(schedule, doc) {
    return schedule.description({ schedule: schedule, doc: doc });
  };

  var getFlow = function(schedule) {
    var flow = nools.getFlow('medic');
    if (flow) {
      return flow;
    }
    return nools.compile(rules, { name: 'medic', scope: {
      schedule: schedule,
      addDate: addDate,
      createTitle: createTitle,
      createDescription: createDescription
    }});
  };

  inboxServices.factory('TaskGenerator', [ 'Search',
    function(Search) {
      return function() {
        var flow = getFlow(schedule);
        var Registration = flow.getDefined('registration');
        return new Promise(function(resolve, reject) {
          Search(
            { filterModel: { type: 'reports', forms: [ { code: 'P' } ], date: {}, facilities: [] }, filterQuery: '', forms: [ { code: 'P' }, { code: 'R' }, { code: 'V' } ] },
            { limit: 99999999 },
            function(err, data) {
              if (err) {
                return reject(err);
              }
              var session = flow.getSession();
              var visits = [];
              session.on('visit', function(visit) {
                visits.push(visit);
              });
              data.forEach(function(doc) {
                session.assert(new Registration({
                  doc: doc,
                  lmpDate: addDate(new Date(doc.reported_date), doc.fields.last_menstrual_period * -7)
                }));
              });
              session.match().then(
                function() {
                  resolve(visits);
                },
                reject
              );
            }
          );
        });
      };
    }
  ]);

}()); 
