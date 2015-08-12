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
    "define Task {" +
    "  _id: null," +
    "  doc: null," +
    "  type: null," +
    "  date: null," +
    "  title: null," +
    "  fields: null" +
    "}" +
    "" +
    "rule GenerateEvents {" +
    "  when {" +
    "    r: Registration" +
    "  }" +
    "  then {" +
    "    schedule.forEach(function(s) {" +
    "      var visit = new Task({" +
    "        _id: r.doc._id + '-' + s.id," +
    "        doc: r.doc," +
    "        type: 'visit'," +
    "        date: addDate(r.lmpDate, s.days).toISOString()," +
    "        title: s.title," +
    "        fields: [" +
    "          {" +
    "            label: { en: 'Description' }," +
    "            value: s.description" +
    "          }" +
    "        ]" +
    "      });" +
    "      emit('task', visit);" +
    "      assert(visit);" +
    "    });" +
    "  }" +
    "}";

  var schedule = [
    {
      id: 1,
      days: 50,
      title: { en: 'ANC visit #1 for {{doc.fields.patient_name}}' },
      description: { en: 'Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #1. Remember to check for danger signs!' }
    },
    {
      id: 2,
      days: 100,
      title: { en: 'ANC visit #2 for {{doc.fields.patient_name}}' },
      description: { en: 'Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #2. Remember to check for danger signs!' }
    },
    {
      id: 3,
      days: 150,
      title: { en: 'ANC visit #3 for {{doc.fields.patient_name}}' },
      description: { en: 'Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #3. Remember to check for danger signs!' }
    },
    {
      id: 4,
      days: 200,
      title: { en: 'ANC visit #4 for {{doc.fields.patient_name}}' },
      description: { en: 'Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #4. Remember to check for danger signs!' }
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
        return new Promise(function(resolve, reject) {
          var flow = getFlow(schedule);
          var Registration = flow.getDefined('registration');
          Search(
            { filterModel: { type: 'reports', forms: [ { code: 'P' } ], date: {}, facilities: [] }, filterQuery: '', forms: [ { code: 'P' }, { code: 'R' }, { code: 'V' } ] },
            { limit: 99999999 },
            function(err, data) {
              if (err) {
                return reject(err);
              }
              var session = flow.getSession();
              var tasks = [];
              session.on('task', function(task) {
                tasks.push(task);
              });
              data.forEach(function(doc) {
                session.assert(new Registration({
                  doc: doc,
                  lmpDate: addDate(new Date(doc.reported_date), doc.fields.last_menstrual_period * -7)
                }));
              });
              session.match().then(
                function() {
                  resolve(tasks);
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
