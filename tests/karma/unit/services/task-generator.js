describe('TaskGenerator service', function() {

  'use strict';

  var service,
      Search,
      Settings,
      $rootScope;

  /* jshint quotmark: false */
  var rules =
    "define Report {" +
    "  doc: null," +
    "  reports: null" +
    "}" +
    "" +
    "define Task {" +
    "  _id: null," +
    "  doc: null," +
    "  type: null," +
    "  date: null," +
    "  title: null," +
    "  fields: null," +
    "  reports: null," + // exposed for testing only
    "  resolved: null" +
    "}" +
    "" +
    "rule GenerateEvents {" +
    "  when {" +
    "    r: Report" +
    "  }" +
    "  then {" +
    "    if (r.doc.form === 'P' || r.doc.form === 'R') {" +
    "      var visitCount = 0;" +
    "      r.reports.forEach(function(report) {" +
    "        if (report.form === 'V') {" +
    "          visitCount++;" +
    "        }" +
    "      });" +
    "      Utils.getSchedule('anc-registration').events.forEach(function(s) {" +
    "        var visit = new Task({" +
    "          _id: r.doc._id + '-' + s.id," +
    "          doc: r.doc," +
    "          type: s.type," +
    "          date: Utils.addDate(Utils.getLmpDate(r.doc), s.days).toISOString()," +
    "          title: s.title," +
    "          fields: [" +
    "            {" +
    "              label: [{ content: 'Description', locale: 'en' }]," +
    "              value: s.description" +
    "            }" +
    "          ]," +
    "          reports: r.reports," +
    "          resolved: visitCount > 0" +
    "        });" +
    "        emit('task', visit);" +
    "        assert(visit);" +
    "        visitCount--;" +
    "      });" +
    "    } else if (r.doc.form === 'V') {" +
    "      Utils.getSchedule('anc-follow-up').events.forEach(function(s) {" +
    "        var visit = new Task({" +
    "          _id: r.doc._id + '-' + s.id," +
    "          doc: r.doc," +
    "          type: s.type," +
    "          date: Utils.addDate(Utils.getLmpDate(r.doc), s.days).toISOString()," +
    "          title: s.title," +
    "          fields: [" +
    "            {" +
    "              label: [{ content: 'Description', locale: 'en' }]," +
    "              value: s.description" +
    "            }" +
    "          ]," +
    "          reports: r.reports," +
    "          resolved: visitCount > 0" +
    "        });" +
    "        emit('task', visit);" +
    "        assert(visit);" +
    "      });" +
    "    }" +
    "  }" +
    "}";
  /* jshint quotmark: true */

  var dataRecords = [
    {
      _id: 1,
      form: 'P',
      reported_date: 1437618272360,
      fields: {
        patient_id: '059',
        patient_name: 'Jenny',
        last_menstrual_period: 10
      }
    },
    {
      _id: 2,
      form: 'P',
      reported_date: 1437820272360,
      fields: {
        patient_id: '946',
        patient_name: 'Sally',
        last_menstrual_period: 20
      }
    },
    {
      _id: 3,
      form: 'V',
      reported_date: 1438820272360,
      fields: {
        patient_id: '059'
      }
    },
    {
      _id: 4,
      form: 'R',
      reported_date: 1437920272360,
      fields: {
        patient_id: '555',
        patient_name: 'Rachel'
      }
    }
  ];

  var schedules = [
    {
      name: 'anc-registration',
      events: [
        {
          id: 'visit-1',
          days: 50,
          type: 'visit',
          title: [{ content: 'ANC visit #1 for {{doc.fields.patient_name}}', locale: 'en' }],
          description: [{ content: 'Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #1. Remember to check for danger signs!', locale: 'en' }]
        },
        {
          id: 'visit-2',
          days: 100,
          type: 'visit',
          title: [{ content: 'ANC visit #2 for {{doc.fields.patient_name}}', locale: 'en' }],
          description: [{ content: 'Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #2. Remember to check for danger signs!', locale: 'en' }]
        },
        {
          id: 'immunisation-1',
          days: 150,
          type: 'immunisation',
          title: [{ content: 'ANC immunisation #1 for {{doc.fields.patient_name}}', locale: 'en' }],
          description: [{ content: 'Please immunise {{doc.fields.patient_name}} in Harrisa Village.', locale: 'en' }]
        }
      ]
    },
    {
      name: 'anc-follow-up',
      events: [
        {
          id: 'follow-up-1',
          days: 50,
          type: 'visit',
          title: [{ content: 'ANC follow up #1 for {{doc.fields.patient_name}}', locale: 'en' }],
          description: [{ content: 'Please follow up {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #1. Remember to check for danger signs!', locale: 'en' }]
        }
      ]
    }
  ];

  beforeEach(function() {
    Search = sinon.stub();
    Settings = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Search', Search);
      $provide.value('Settings', Settings);
    });
    inject(function($injector, _$rootScope_) {
      $rootScope = _$rootScope_;
      service = $injector.get('TaskGenerator');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Search, Settings);
  });

  it('returns search errors', function(done) {
    Search.callsArgWith(2, 'boom');
    Settings.callsArgWith(0, null, {
      tasks: {
        rules: rules,
        schedules: schedules
      }
    });
    service().catch(function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(Search.callCount).to.equal(1);
      done();
    });
    $rootScope.$digest();
  });

  it('returns settings errors', function(done) {
    Settings.callsArgWith(0, 'boom');
    service().catch(function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(Settings.callCount).to.equal(1);
      done();
    });
    $rootScope.$digest();
  });

  it('returns empty when search returns no documents', function(done) {
    Search.callsArgWith(2, null, []);
    Settings.callsArgWith(0, null, {
      tasks: {
        rules: rules,
        schedules: schedules
      }
    });
    service().then(function(actual) {
      chai.expect(Search.callCount).to.equal(1);
      chai.expect(actual).to.deep.equal([]);
      done();
    }).catch(done);
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  it('returns empty when settings returns no config', function(done) {
    Settings.callsArgWith(0, null, {});
    service().then(function(actual) {
      chai.expect(Search.callCount).to.equal(0);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(actual).to.deep.equal([]);
      done();
    }).catch(done);
    $rootScope.$digest();
  });

  it('generates tasks when given registrations', function(done) {
    var calculateDate = function(registration, days) {
      var lmpWeeks = registration.form === 'P' ? registration.fields.last_menstrual_period : 4;
      return moment(registration.reported_date)
        .subtract(lmpWeeks, 'weeks')
        .add(days, 'days')
        .toISOString();
    };

    Search.callsArgWith(2, null, dataRecords);
    Settings.callsArgWith(0, null, {
      tasks: {
        rules: rules,
        schedules: schedules
      }
    });

    var expectations = function(actual, registration, schedule, reports, resolved) {
      var task = _.findWhere(actual, { _id: registration._id + '-' + schedule.id });
      if (!task) {
        console.log('Failed to generate task: ' + registration._id + '-' + schedule.id);
      }
      chai.expect(!!task).to.equal(true);
      chai.expect(task.type).to.equal(schedule.type);
      chai.expect(task.date).to.equal(calculateDate(registration, schedule.days));
      chai.expect(task.title).to.deep.equal(schedule.title);
      chai.expect(task.fields[0].label).to.deep.equal([{ content: 'Description', locale: 'en' }]);
      chai.expect(task.fields[0].value).to.deep.equal(schedule.description);
      chai.expect(task.doc._id).to.equal(registration._id);
      chai.expect(task.resolved).to.equal(resolved);
      chai.expect(task.reports).to.deep.equal(reports);
    };
    service().then(function(actual) {
      chai.expect(Search.callCount).to.equal(1);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(actual.length).to.equal(10);
      expectations(actual, dataRecords[0], schedules[0].events[0], [ dataRecords[2] ], true);
      expectations(actual, dataRecords[0], schedules[0].events[1], [ dataRecords[2] ], false);
      expectations(actual, dataRecords[0], schedules[0].events[2], [ dataRecords[2] ], false);
      expectations(actual, dataRecords[1], schedules[0].events[0], [ ], false);
      expectations(actual, dataRecords[1], schedules[0].events[1], [ ], false);
      expectations(actual, dataRecords[1], schedules[0].events[2], [ ], false);
      expectations(actual, dataRecords[2], schedules[1].events[0], [ dataRecords[0] ], false);
      expectations(actual, dataRecords[3], schedules[0].events[0], [ ], false);
      expectations(actual, dataRecords[3], schedules[0].events[1], [ ], false);
      expectations(actual, dataRecords[3], schedules[0].events[2], [ ], false);
      done();
    }).catch(done);
    setTimeout(function() {
      $rootScope.$digest();
    });
  });
});