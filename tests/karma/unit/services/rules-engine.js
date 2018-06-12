describe('RulesEngine service', function() {

  'use strict';

  var Search,
      Settings,
      UserContact,
      Changes,
      injector,
      nools;

  /* jshint quotmark: false */
  var rules =
    "define Contact {" +
    "  contact: null," +
    "  reports: null" +
    "}" +
    "" +
    "define Task {" +
    "  _id: null," +
    "  doc: null," +
    "  contact: null," +
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
    "    c: Contact" +
    "  }" +
    "  then {" +
    "    var visitCount = 0;" +
    "    if (!c.reports.length) {" +
    "      emit('task', new Task({" +
    "        _id: 'no-reports'," +
    "        doc: null," +
    "        contact: c.contact," +
    "        type: 'no-report'," +
    "        date: new Date()," +
    "        title: 'No Report'," +
    "        fields: []," +
    "        reports: []," +
    "        resolved: false" +
    "      }))" +
    "    }" +
    "    c.reports.forEach(function(r) {" +
    "      if (r.form === 'V') {" +
    "        visitCount++;" +
    "      }" +
    "    });" +
    "    c.reports.forEach(function(r) {" +
    "      if (r.form === 'P' || r.form === 'R') {" +
    "        Utils.getSchedule('anc-registration').events.forEach(function(s) {" +
    "          var visit = new Task({" +
    "            _id: r._id + '-' + s.id," +
    "            doc: r," +
    "            contact: c.contact," +
    "            type: s.type," +
    "            date: Utils.addDate(Utils.getLmpDate(r), s.days).toISOString()," +
    "            title: s.title," +
    "            fields: [" +
    "              {" +
    "                label: [{ content: 'Description', locale: 'en' }]," +
    "                value: s.description" +
    "              }" +
    "            ]," +
    "            reports: c.reports," +
    "            resolved: visitCount > 0" +
    "          });" +
    "          emit('task', visit);" +
    "          assert(visit);" +
    "          visitCount--;" +
    "        });" +
    "      } else if (r.form === 'V') {" +
    "        Utils.getSchedule('anc-follow-up').events.forEach(function(s) {" +
    "          var visit = new Task({" +
    "            _id: r._id + '-' + s.id," +
    "            doc: r," +
    "            contact: c.contact," +
    "            type: s.type," +
    "            date: Utils.addDate(Utils.getLmpDate(r), s.days).toISOString()," +
    "            title: s.title," +
    "            fields: [" +
    "              {" +
    "                label: [{ content: 'Description', locale: 'en' }]," +
    "                value: s.description" +
    "              }" +
    "            ]," +
    "            reports: c.reports," +
    "            resolved: visitCount > 0" +
    "          });" +
    "          emit('task', visit);" +
    "          assert(visit);" +
    "        });" +
    "      }" +
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
        patient_id: 1,
        last_menstrual_period: 10
      }
    },
    {
      _id: 2,
      form: 'P',
      reported_date: 1437820272360,
      fields: {
        patient_id: 2,
        last_menstrual_period: 20
      }
    },
    {
      _id: 3,
      form: 'V',
      reported_date: 1438820272360,
      fields: {
        patient_id: 1
      }
    },
    {
      _id: 4,
      form: 'R',
      reported_date: 1437920272360,
      fields: {
        patient_id: 3
      }
    }
  ];

  var contacts = [
    { _id: 1, name: 'Jenny' },
    { _id: 2, name: 'Sally' },
    { _id: 3, name: 'Rachel' }
  ];

  var schedules = [
    {
      name: 'anc-registration',
      events: [
        {
          id: 'visit-1',
          days: 50,
          type: 'visit',
          title: [{ content: 'ANC visit #1 for {{contact.name}}', locale: 'en' }],
          description: [{ content: 'Please visit {{contact.name}} in Harrisa Village and refer her for ANC visit #1. Remember to check for danger signs!', locale: 'en' }]
        },
        {
          id: 'visit-2',
          days: 100,
          type: 'visit',
          title: [{ content: 'ANC visit #2 for {{contact.name}}', locale: 'en' }],
          description: [{ content: 'Please visit {{contact.name}} in Harrisa Village and refer her for ANC visit #2. Remember to check for danger signs!', locale: 'en' }]
        },
        {
          id: 'immunisation-1',
          days: 150,
          type: 'immunisation',
          title: [{ content: 'ANC immunisation #1 for {{contact.name}}', locale: 'en' }],
          description: [{ content: 'Please immunise {{contact.name}} in Harrisa Village.', locale: 'en' }]
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
          title: [{ content: 'ANC follow up #1 for {{contact.name}}', locale: 'en' }],
          description: [{ content: 'Please follow up {{contact.name}} in Harrisa Village and refer her for ANC visit #1. Remember to check for danger signs!', locale: 'en' }]
        }
      ]
    }
  ];

  var calculateDate = function(registration, days) {
    var lmpWeeks = registration.form === 'P' ? registration.fields.last_menstrual_period : 4;
    return moment(registration.reported_date)
      .subtract(lmpWeeks, 'weeks')
      .add(days, 'days')
      .hours(0)
      .minutes(0)
      .seconds(0)
      .milliseconds(0)
      .toISOString();
  };

  beforeEach(function() {
    Search = sinon.stub();
    Settings = sinon.stub();
    UserContact = sinon.stub();
    Changes = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Search', Search);
      $provide.value('Settings', Settings);
      $provide.value('UserContact', UserContact);
      $provide.value('Changes', Changes);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', {
        isOnlineOnly: function() {
          return false;
        }
      });
    });
    inject(function($injector) {
      injector = $injector;
    });
  });

  afterEach(function() {
    if (nools) {
      nools.deleteFlow('medic');
    }
    KarmaUtils.restore(Search, Settings, Changes, UserContact);
  });

  var getService = function() {
    var service = injector.get('RulesEngine');
    nools = service._nools;
    return service;
  };

  it('returns search errors', function(done) {
    Search.returns(Promise.reject('boom'));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));
    var service = getService();
    service.listen('test', 'task', function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(Search.callCount).to.equal(2);
      done();
    });
  });

  it('returns settings errors', function(done) {
    Settings.returns(Promise.reject('boom'));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));
    var service = getService();
    service.listen('test', 'task', function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(Settings.callCount).to.equal(1);
      done();
    });
  });

  it('returns empty when settings returns no config', function(done) {
    Settings.returns(Promise.resolve({}));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));
    var service = getService();
    service.listen('test', 'task', function(err, actual) {
      chai.expect(Search.callCount).to.equal(0);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(actual).to.deep.equal([]);
      done();
    });
  });

  it('generates tasks when given registrations', function(done) {

    Search.onFirstCall().returns(Promise.resolve(dataRecords));
    Search.onSecondCall().returns(Promise.resolve(contacts));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var expectations = {
      '1-visit-1': {
        registration: dataRecords[0],
        schedule: schedules[0].events[0],
        reports: [ dataRecords[0], dataRecords[2] ],
        resolved: true
      },
      '1-visit-2': {
        registration: dataRecords[0],
        schedule: schedules[0].events[1],
        reports: [ dataRecords[0], dataRecords[2] ],
        resolved: false
      },
      '1-immunisation-1': {
        registration: dataRecords[0],
        schedule: schedules[0].events[2],
        reports: [ dataRecords[0], dataRecords[2] ],
        resolved: false
      },
      '2-visit-1': {
        registration: dataRecords[1],
        schedule: schedules[0].events[0],
        reports: [ dataRecords[1] ],
        resolved: false
      },
      '2-visit-2': {
        registration: dataRecords[1],
        schedule: schedules[0].events[1],
        reports: [ dataRecords[1] ],
        resolved: false
      },
      '2-immunisation-1': {
        registration: dataRecords[1],
        schedule: schedules[0].events[2],
        reports: [ dataRecords[1] ],
        resolved: false
      },
      '3-follow-up-1': {
        registration: dataRecords[2],
        schedule: schedules[1].events[0],
        reports: [ dataRecords[0], dataRecords[2] ],
        resolved: false
      },
      '4-visit-1': {
        registration: dataRecords[3],
        schedule: schedules[0].events[0],
        reports: [ dataRecords[3] ],
        resolved: false
      },
      '4-visit-2': {
        registration: dataRecords[3],
        schedule: schedules[0].events[1],
        reports: [ dataRecords[3] ],
        resolved: false
      },
      '4-immunisation-1': {
        registration: dataRecords[3],
        schedule: schedules[0].events[2],
        reports: [ dataRecords[3] ],
        resolved: false
      }
    };

    var service = getService();
    var compile = sinon.spy(service._nools, 'compile');
    var callbackCount = 0;

    service.listen('test', 'task', function(err, actuals) {
      actuals.forEach(function(actual) {
        var expected = expectations[actual._id];
        chai.expect(actual.type).to.equal(expected.schedule.type);
        chai.expect(actual.date).to.equal(calculateDate(expected.registration, expected.schedule.days));
        chai.expect(actual.title).to.deep.equal(expected.schedule.title);
        chai.expect(actual.fields[0].label).to.deep.equal([{ content: 'Description', locale: 'en' }]);
        chai.expect(actual.fields[0].value).to.deep.equal(expected.schedule.description);
        chai.expect(actual.doc._id).to.equal(expected.registration._id);
        chai.expect(actual.resolved).to.equal(expected.resolved);
        chai.expect(actual.reports).to.deep.equal(expected.reports);
        callbackCount++;
        if (callbackCount === 10) {
          chai.expect(Search.callCount).to.equal(2);
          chai.expect(Settings.callCount).to.equal(1);
          chai.expect(UserContact.callCount).to.equal(1);
          chai.expect(compile.callCount).to.equal(1);
          chai.expect(compile.args[0][0]).to.deep.equal(rules);
          chai.expect(compile.args[0][1].name).to.equal('medic');
          chai.expect(compile.args[0][1].scope).to.have.property('Utils');
          chai.expect(compile.args[0][1].scope.user.name).to.equal('Jim');
          compile.restore();
          done();
        }
      });
    });
  });

  it('generates tasks using patient_id - #2986', function(done) {

    var dataRecord = {
      _id: 1,
      form: 'P',
      reported_date: 1437618272360,
      fields: {
        patient_id: '12345',
        last_menstrual_period: 10
      }
    };
    var contact = {
      _id: 2,
      name: 'Jenny',
      patient_id: '12345'
    };
    Search.onFirstCall().returns(Promise.resolve([ dataRecord ]));
    Search.onSecondCall().returns(Promise.resolve([ contact ]));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var expectations = {
      '1-visit-1': {
        registration: dataRecord,
        schedule: schedules[0].events[0],
        reports: [ dataRecord ],
        resolved: false
      },
      '1-visit-2': {
        registration: dataRecord,
        schedule: schedules[0].events[1],
        reports: [ dataRecord ],
        resolved: false
      }
    };

    var service = getService();
    var compile = sinon.spy(service._nools, 'compile');
    var callbackCount = 0;

    service.listen('test', 'task', function(err, actuals) {
      actuals.forEach(function(actual) {
        var expected = expectations[actual._id];
        chai.expect(actual.type).to.equal(expected.schedule.type);
        chai.expect(actual.date).to.equal(calculateDate(expected.registration, expected.schedule.days));
        chai.expect(actual.title).to.deep.equal(expected.schedule.title);
        chai.expect(actual.fields[0].label).to.deep.equal([{ content: 'Description', locale: 'en' }]);
        chai.expect(actual.fields[0].value).to.deep.equal(expected.schedule.description);
        chai.expect(actual.doc._id).to.equal(expected.registration._id);
        chai.expect(actual.resolved).to.equal(expected.resolved);
        chai.expect(actual.reports).to.deep.equal(expected.reports);
        chai.expect(actual.contact).to.deep.equal(contact);
        callbackCount++;
        if (callbackCount === 2) {
          chai.expect(Search.callCount).to.equal(2);
          chai.expect(Settings.callCount).to.equal(1);
          chai.expect(UserContact.callCount).to.equal(1);
          chai.expect(compile.callCount).to.equal(1);
          chai.expect(compile.args[0][0]).to.deep.equal(rules);
          chai.expect(compile.args[0][1].name).to.equal('medic');
          chai.expect(compile.args[0][1].scope).to.have.property('Utils');
          chai.expect(compile.args[0][1].scope.user.name).to.equal('Jim');
          compile.restore();
          done();
        }
      });
    });
  });

  it('caches tasks', function(done) {

    Search.onFirstCall().returns(Promise.resolve(dataRecords));
    Search.onSecondCall().returns(Promise.resolve(contacts));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var service = getService();
    var expected = {};
    service.listen('test', 'task', function(err, results) {
      results.forEach(function(result) {
        expected[result._id] = result;
      });
      if (_.values(expected).length === 10) {
        service.listen('another-test', 'task', function(err, actual) {
          // Search and Settings shouldn't be called again, and
          // results should be the same
          chai.expect(Search.callCount).to.equal(2);
          chai.expect(Settings.callCount).to.equal(1);
          chai.expect(actual).to.deep.equal(_.values(expected));
          done();
        });
      }
    });

  });

  it('updates when a contact is deleted', function(done) {

    var dataRecords = [
      {
        _id: 2,
        form: 'P',
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    var contacts = [
      { _id: 1, name: 'Jenny' }
    ];

    Search.onFirstCall().returns(Promise.resolve(dataRecords));
    Search.onSecondCall().returns(Promise.resolve(contacts));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var callbackCount = 0;
    var service = getService();
    service.listen('test', 'task', function(err, actual) {
      callbackCount++;
      if (callbackCount === 4) {
        Changes.args[0][0].callback({
          deleted: true,
          id: 1
        });
      } else if (callbackCount === 5 || callbackCount === 6 || callbackCount === 7) {
        chai.expect(actual[0].contact.deleted).to.equal(true);
        if (callbackCount === 7) {
          done();
        }
      }
    });
  });

  it('updates when a report is deleted', function(done) {

    var dataRecords = [
      {
        _id: 2,
        form: 'P',
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      },
      {
        _id: 3,
        form: 'P',
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    var contacts = [
      { _id: 1, name: 'Jenny' }
    ];

    Search.onFirstCall().returns(Promise.resolve(dataRecords));
    Search.onSecondCall().returns(Promise.resolve(contacts));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var callbackCount = 0;
    var service = getService();
    service.listen('test', 'task', function(err, actual) {
      callbackCount++;
      if (callbackCount === 6) {
        Changes.args[0][0].callback({
          deleted: true,
          id: 2
        });
      } else if (callbackCount === 7) {
        // Both reports are still there
        chai.expect(actual[0].reports.length).to.equal(2);
        // Report 2 is deleted
        chai.expect(actual[0].reports[0]._id).to.equal(2);
        chai.expect(actual[0].reports[0].deleted).to.equal(true);
        // Report 3 is not
        chai.expect(actual[0].reports[1]._id).to.equal(3);
        chai.expect(!!actual[0].reports[1].deleted).to.equal(false);
        done();
      }
    });
  });

  it('updates when a contact is added', function(done) {

    var dataRecords = [
      {
        _id: 2,
        form: 'P',
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    var contacts = [
      { _id: 1, name: 'Jenny' }
    ];

    var newContact = { _id: 4, name: 'Sarah' };

    Search.onFirstCall().returns(Promise.resolve(dataRecords));
    Search.onSecondCall().returns(Promise.resolve(contacts));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var callbackCount = 0;
    var service = getService();
    service.listen('test', 'task', function(err, actual) {
      if (err) {
        return done(err);
      }
      callbackCount++;
      if (callbackCount === 4) {
        Changes.args[0][0].callback({
          id: newContact._id,
          doc: newContact
        });
      } else if (callbackCount === 5) {
        chai.expect(actual[0].type).to.equal('no-report');
        chai.expect(actual[0].contact._id).to.equal(4);
        done();
      }
    });
  });

  it('updates when a report is added', function(done) {

    var dataRecords = [
      {
        _id: 2,
        form: 'P',
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    var newReport = {
      _id: 3,
      form: 'P',
      reported_date: 1437618272360,
      fields: {
        patient_id: 1,
        last_menstrual_period: 10
      }
    };

    var contacts = [
      { _id: 1, name: 'Jenny' }
    ];

    Search.onFirstCall().returns(Promise.resolve(dataRecords));
    Search.onSecondCall().returns(Promise.resolve(contacts));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var callbackCount = 0;
    var service = getService();
    service.listen('test', 'task', function(err, actual) {
      if (err) {
        return done(err);
      }
      callbackCount++;
      if (callbackCount === 4) {
        Changes.args[0][0].callback({
          id: newReport._id,
          doc: newReport
        });
      } else if (callbackCount === 5) {
        chai.expect(actual[0].reports.length).to.equal(2);
        done();
      }
    });
  });

  it('updates when a report is added matching the contact patient_id - #3111', function(done) {

    var dataRecords = [
      {
        _id: 2,
        form: 'P',
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    var newReport = {
      _id: 3,
      form: 'P',
      reported_date: 1437618272360,
      fields: {
        patient_id: 1,
        last_menstrual_period: 10
      }
    };

    var contacts = [
      { _id: 'some_uuid', name: 'Jenny', patient_id: 1 }
    ];

    Search.onFirstCall().returns(Promise.resolve(dataRecords));
    Search.onSecondCall().returns(Promise.resolve(contacts));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var callbackCount = 0;
    var service = getService();
    service.listen('test', 'task', function(err, actual) {
      if (err) {
        return done(err);
      }
      callbackCount++;
      if (callbackCount === 4) {
        Changes.args[0][0].callback({
          id: newReport._id,
          doc: newReport
        });
      } else if (callbackCount === 5) {
        chai.expect(actual[0].reports.length).to.equal(2);
        done();
      }
    });
  });

  it('updates when a contact is updated', function(done) {

    var dataRecords = [
      {
        _id: 2,
        form: 'P',
        reported_date: 1437618272360,
        fields: {
          contact: {
            _id: 1,
            name: 'Jenny'
          }
        },
        last_menstrual_period: 10
      }
    ];

    var contacts = [
      { _id: 1, name: 'Jenny' }
    ];

    Search.onFirstCall().returns(Promise.resolve(dataRecords));
    Search.onSecondCall().returns(Promise.resolve(contacts));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var callbackCount = 0;
    var service = getService();
    service.listen('test', 'task', function(err, actual) {
      if (err) {
        return done(err);
      }
      callbackCount++;
      if (callbackCount === 4) {
        Changes.args[0][0].callback({
          id: 1,
          doc: { _id: 1, name: 'Jennifer' }
        });
      } else if (callbackCount === 5) {
        chai.expect(actual[0].contact.name).to.equal('Jennifer');
        done();
      }
    });
  });

  it('updates when a report is updated', function(done) {

    var dataRecords = [
      {
        _id: 2,
        form: 'P',
        reported_date: 1437618272360,
        fields: {
          contact: {
            _id: 1,
            name: 'Jenny'
          }
        },
        last_menstrual_period: 10
      }
    ];

    var contacts = [
      { _id: 1, name: 'Jenny' }
    ];

    Search.onFirstCall().returns(Promise.resolve(dataRecords));
    Search.onSecondCall().returns(Promise.resolve(contacts));
    Settings.returns(Promise.resolve({
      tasks: {
        rules: rules,
        schedules: schedules
      }
    }));
    UserContact.returns(Promise.resolve({ name: 'Jim' }));

    var callbackCount = 0;
    var service = getService();
    service.listen('test', 'task', function(err, actual) {
      if (err) {
        return done(err);
      }
      callbackCount++;
      if (callbackCount === 4) {
        Changes.args[0][0].callback({
          id: 2,
          doc: {
            _id: 2,
            form: 'P',
            reported_date: 1437618272360,
            fields: {
              patient_id: 1,
              last_menstrual_period: 15
            }
          }
        });
      } else if (callbackCount === 5) {
        chai.expect(actual[0].doc.fields.last_menstrual_period).to.equal(15);
        done();
      }
    });
  });

});
