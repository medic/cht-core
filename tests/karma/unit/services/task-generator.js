describe('TaskGenerator service', function() {

  'use strict';

  var service,
      Search,
      Settings;

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
    "    schedules.forEach(function(s) {" +
    "      var visit = new Task({" +
    "        _id: r.doc._id + '-' + s.id," +
    "        doc: r.doc," +
    "        type: s.type," +
    "        date: Utils.addDate(r.lmpDate, s.days).toISOString()," +
    "        title: s.title," +
    "        fields: [" +
    "          {" +
    "            label: [{ content: 'Description', locale: 'en' }]," +
    "            value: s.description" +
    "          }" +
    "        ]" +
    "      });" +
    "      emit('task', visit);" +
    "      assert(visit);" +
    "    });" +
    "  }" +
    "}";
  /* jshint quotmark: true */

  var dataRecords = [
    {
      _id: 1,
      form: 'P',
      reported_date: 1437618272360,
      fields: {
        patient_name: 'Jenny',
        last_menstrual_period: 10
      }
    },
    {
      _id: 2,
      form: 'P',
      reported_date: 1437820272360,
      fields: {
        patient_name: 'Sally',
        last_menstrual_period: 20
      }
    },
    {
      _id: 3,
      form: 'V',
      reported_date: 1438820272360
    },
    {
      _id: 4,
      form: 'R',
      reported_date: 1437920272360,
      fields: {
        patient_name: 'Rachel'
      }
    }
  ];

  var schedules = [
    {
      id: 'visit-1',
      days: 50,
      type: 'visit',
      title: [{ content: 'ANC visit #1 for {{doc.fields.patient_name}}', locale: 'en' }],
      description: [{ content: 'Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #1. Remember to check for danger signs!', locale: 'en' }]
    },
    {
      id: 'immunisation-1',
      days: 150,
      type: 'immunisation',
      title: [{ content: 'ANC immunisation #1 for {{doc.fields.patient_name}}', locale: 'en' }],
      description: [{ content: 'Please immunise {{doc.fields.patient_name}} in Harrisa Village.', locale: 'en' }]
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
    inject(function($injector) {
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
  });

  it('returns settings errors', function(done) {
    Settings.callsArgWith(0, 'boom');
    service().catch(function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(Settings.callCount).to.equal(1);
      done();
    });
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
    }).catch(function(err) {
      console.error(err.toString());
    });
  });

  it('returns empty when settings returns no config', function(done) {
    Settings.callsArgWith(0, null, {});
    service().then(function(actual) {
      chai.expect(Search.callCount).to.equal(0);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(actual).to.deep.equal([]);
      done();
    }).catch(function(err) {
      console.error(err.toString());
    });
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
      anc_forms: {
        registration: 'R',
        registrationLmp: 'P',
        visit: 'V',
        delivery: 'D',
        flag: 'F'
      },
      tasks: {
        rules: rules,
        schedules: schedules
      }
    });

    var expectations = function(actual, registration, schedule) {
      var task = _.findWhere(actual, { _id: registration._id + '-' + schedule.id });
      chai.expect(task.type).to.equal(schedule.type);
      chai.expect(task.date).to.equal(calculateDate(registration, schedule.days));
      chai.expect(task.title).to.deep.equal(schedule.title);
      chai.expect(task.fields[0].label).to.deep.equal([{ content: 'Description', locale: 'en' }]);
      chai.expect(task.fields[0].value).to.deep.equal(schedule.description);
      chai.expect(task.doc._id).to.equal(registration._id);
    };
    service().then(function(actual) {
      chai.expect(Search.callCount).to.equal(1);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(actual.length).to.equal(6);
      expectations(actual, dataRecords[0], schedules[0]);
      expectations(actual, dataRecords[0], schedules[1]);
      expectations(actual, dataRecords[1], schedules[0]);
      expectations(actual, dataRecords[1], schedules[1]);
      expectations(actual, dataRecords[3], schedules[0]);
      expectations(actual, dataRecords[3], schedules[1]);
      done();
    }).catch(function(err) {
      console.error(err.toString());
    });
  });
});