
describe(`RulesEngine service`, () => {
  const { expect } = chai;

  'use strict';

  let Search,
      Settings,
      UserContact,
      Changes,
      injector,
      nools;

  const rules =
    `define Contact {
      contact: null,
      reports: null
    }
      
    define Task {
      _id: null,
      doc: null,
      contact: null,
      type: null,
      date: null,
      title: null,
      fields: null,
      reports: null,
      resolved: null
    }
    
    rule GenerateEvents {
      when {
        c: Contact
      }
      then {
        var visitCount = 0;
        if (!c.reports.length) {
          emit('task', new Task({
            _id: 'no-reports',
            doc: null,
            contact: c.contact,
            type: 'no-report',
            date: new Date(),
            title: 'No Report',
            fields: [],
            reports: [],
            resolved: false
          }))
        }
        c.reports.forEach(function(r) {
          if (r.form === 'V') {
            visitCount++;
          }
        });
        c.reports.forEach(function(r) {
          if (r.form === 'P' || r.form === 'R') {
            Utils.getSchedule('anc-registration').events.forEach(function(s) {
              var visit = new Task({
                _id: r._id + '-' + s.id,
                doc: r,
                contact: c.contact,
                type: s.type,
                date: Utils.addDate(Utils.getLmpDate(r), s.days).toISOString(),
                title: s.title,
                fields: [
                  {
                    label: [{ content: 'Description', locale: 'en' }],
                    value: s.description
                  }
                ],
                reports: c.reports,
                resolved: visitCount > 0
              });
              emit('task', visit);
              assert(visit);
              visitCount--;
            });
          } else if (r.form === 'V') {
            Utils.getSchedule('anc-follow-up').events.forEach(function(s) {
              var visit = new Task({
                _id: r._id + '-' + s.id,
                doc: r,
                contact: c.contact,
                type: s.type,
                date: Utils.addDate(Utils.getLmpDate(r), s.days).toISOString(),
                title: s.title,
                fields: [
                  {
                    label: [{ content: 'Description', locale: 'en' }],
                    value: s.description
                  }
                ],
                reports: c.reports,
                resolved: visitCount > 0
              });
              emit('task', visit);
              assert(visit);
            });
          }
        });
      }
    }`;

  const dataRecords = [
    {
      _id: 1,
      form: `P`,
      reported_date: 1437618272360,
      fields: {
        patient_id: 1,
        last_menstrual_period: 10
      }
    },
    {
      _id: 2,
      form: `P`,
      reported_date: 1437820272360,
      fields: {
        patient_id: 2,
        last_menstrual_period: 20
      }
    },
    {
      _id: 3,
      form: `V`,
      reported_date: 1438820272360,
      fields: {
        patient_id: 1
      }
    },
    {
      _id: 4,
      form: `R`,
      reported_date: 1437920272360,
      fields: {
        patient_id: 3
      }
    }
  ];

  const contacts = [
    { _id: 1, name: `Jenny` },
    { _id: 2, name: `Sally` },
    { _id: 3, name: `Rachel` }
  ];

  const schedules = [
    {
      name: `anc-registration`,
      events: [
        {
          id: `visit-1`,
          days: 50,
          type: `visit`,
          title: [{ content: `ANC visit #1 for {{contact.name}}`, locale: `en` }],
          description: [{ content: `Please visit {{contact.name}} in Harrisa Village and refer her for ANC visit #1. Remember to check for danger signs!`, locale: `en` }]
        },
        {
          id: `visit-2`,
          days: 100,
          type: `visit`,
          title: [{ content: `ANC visit #2 for {{contact.name}}`, locale: `en` }],
          description: [{ content: `Please visit {{contact.name}} in Harrisa Village and refer her for ANC visit #2. Remember to check for danger signs!`, locale: `en` }]
        },
        {
          id: `immunisation-1`,
          days: 150,
          type: `immunisation`,
          title: [{ content: `ANC immunisation #1 for {{contact.name}}`, locale: `en` }],
          description: [{ content: `Please immunise {{contact.name}} in Harrisa Village.`, locale: `en` }]
        }
      ]
    },
    {
      name: `anc-follow-up`,
      events: [
        {
          id: `follow-up-1`,
          days: 50,
          type: `visit`,
          title: [{ content: `ANC follow up #1 for {{contact.name}}`, locale: `en` }],
          description: [{ content: `Please follow up {{contact.name}} in Harrisa Village and refer her for ANC visit #1. Remember to check for danger signs!`, locale: `en` }]
        }
      ]
    }
  ];

  const calculateDate = (registration, days) => {
    const lmpWeeks = registration.form === `P` ? registration.fields.last_menstrual_period : 4;
    return moment(registration.reported_date)
      .subtract(lmpWeeks, `weeks`)
      .add(days, `days`)
      .hours(0)
      .minutes(0)
      .seconds(0)
      .milliseconds(0)
      .toISOString();
  };

  beforeEach(() => {
    Search = sinon.stub();
    Settings = sinon.stub();
    UserContact = sinon.stub();
    Changes = sinon.stub();
    module(`inboxApp`);
    module($provide => {
      $provide.value(`Search`, Search);
      $provide.value(`Settings`, Settings);
      $provide.value(`UserContact`, UserContact);
      $provide.value(`Changes`, Changes);
      $provide.value(`$q`, Q); // bypass $q so we don't have to digest
      $provide.value(`Session`, {
        isOnlineOnly: () => {
          return false;
        }
      });
    });
    inject($injector => {
      injector = $injector;
    });
  });

  afterEach(() => {
    if (nools) {
      nools.deleteFlow(`medic`);
    }
    KarmaUtils.restore(Search, Settings, Changes, UserContact);
  });

  const getService = () => {
    const service = injector.get(`RulesEngine`);
    nools = service._nools;
    return service;
  };

  it(`returns search errors`, done => {
    Search.returns(Promise.reject(`boom`));
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });
    const service = getService();
    service.listen(`test`, `task`, err => {
      expect(err).to.equal(`boom`);
      expect(Search.callCount).to.equal(2);
      done();
    });
  });

  it(`returns settings errors`, done => {
    Settings.returns(Promise.reject(`boom`));
    UserContact.resolves({ name: `Jim` });
    const service = getService();
    service.listen(`test`, `task`, err => {
      expect(err).to.equal(`boom`);
      expect(Settings.callCount).to.equal(1);
      done();
    });
  });

  it(`returns empty when settings returns no config`, done => {
    Settings.resolves({});
    UserContact.resolves({ name: `Jim` });
    const service = getService();
    service.listen(`test`, `task`, (err, actual) => {
      expect(Search.callCount).to.equal(0);
      expect(Settings.callCount).to.equal(1);
      expect(actual).to.deep.equal([]);
      done();
    });
  });

  it(`generates tasks when given registrations`, done => {

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves(contacts);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    const expectations = {
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

    const service = getService();
    const compile = sinon.spy(nools, `compile`);
    let callbackCount = 0;

    service.listen(`test`, `task`, (err, actuals) => {
      actuals.forEach(actual => {
        const expected = expectations[actual._id];
        expect(actual.type).to.equal(expected.schedule.type);
        expect(actual.date).to.equal(calculateDate(expected.registration, expected.schedule.days));
        expect(actual.title).to.deep.equal(expected.schedule.title);
        expect(actual.fields[0].label).to.deep.equal([{ content: `Description`, locale: `en` }]);
        expect(actual.fields[0].value).to.deep.equal(expected.schedule.description);
        expect(actual.doc._id).to.equal(expected.registration._id);
        expect(actual.resolved).to.equal(expected.resolved);
        expect(actual.reports).to.deep.equal(expected.reports);
        callbackCount++;
        if (callbackCount === 10) {
          expect(Search.callCount).to.equal(2);
          expect(Settings.callCount).to.equal(1);
          expect(UserContact.callCount).to.equal(1);
          expect(compile.callCount).to.equal(1);
          expect(compile.args[0][0]).to.deep.equal(rules);
          expect(compile.args[0][1].name).to.equal(`medic`);
          expect(compile.args[0][1].scope).to.have.property(`Utils`);
          expect(compile.args[0][1].scope.user.name).to.equal(`Jim`);
          compile.restore();
          done();
        }
      });
    });
  });

  it(`generates tasks using patient_id - #2986`, done => {

    const dataRecord = {
      _id: 1,
      form: `P`,
      reported_date: 1437618272360,
      fields: {
        patient_id: `12345`,
        last_menstrual_period: 10
      }
    };
    const contact = {
      _id: 2,
      name: `Jenny`,
      patient_id: `12345`
    };
    Search.onFirstCall().resolves([ dataRecord ]);
    Search.onSecondCall().resolves([ contact ]);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    const expectations = {
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

    const service = getService();
    const compile = sinon.spy(nools, `compile`);
    let callbackCount = 0;

    service.listen(`test`, `task`, (err, actuals) => {
      actuals.forEach(actual => {
        const expected = expectations[actual._id];
        expect(actual.type).to.equal(expected.schedule.type);
        expect(actual.date).to.equal(calculateDate(expected.registration, expected.schedule.days));
        expect(actual.title).to.deep.equal(expected.schedule.title);
        expect(actual.fields[0].label).to.deep.equal([{ content: `Description`, locale: `en` }]);
        expect(actual.fields[0].value).to.deep.equal(expected.schedule.description);
        expect(actual.doc._id).to.equal(expected.registration._id);
        expect(actual.resolved).to.equal(expected.resolved);
        expect(actual.reports).to.deep.equal(expected.reports);
        expect(actual.contact).to.deep.equal(contact);
        callbackCount++;
        if (callbackCount === 2) {
          expect(Search.callCount).to.equal(2);
          expect(Settings.callCount).to.equal(1);
          expect(UserContact.callCount).to.equal(1);
          expect(compile.callCount).to.equal(1);
          expect(compile.args[0][0]).to.deep.equal(rules);
          expect(compile.args[0][1].name).to.equal(`medic`);
          expect(compile.args[0][1].scope).to.have.property(`Utils`);
          expect(compile.args[0][1].scope.user.name).to.equal(`Jim`);
          compile.restore();
          done();
        }
      });
    });
  });

  it(`caches tasks`, done => {

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves(contacts);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    const service = getService();
    const expected = {};
    service.listen(`test`, `task`, (err, results) => {
      results.forEach(result => {
        expected[result._id] = result;
      });
      if (_.values(expected).length === 10) {
        service.listen(`another-test`, `task`, (err, actual) => {
          // Search and Settings shouldn't be called again, and
          // results should be the same
          expect(Search.callCount).to.equal(2);
          expect(Settings.callCount).to.equal(1);
          expect(actual).to.deep.equal(_.values(expected));
          done();
        });
      }
    });

  });

  it(`updates when a contact is deleted`, done => {

    const dataRecords = [
      {
        _id: 2,
        form: `P`,
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    const contacts = [
      { _id: 1, name: `Jenny` }
    ];

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves(contacts);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    let callbackCount = 0;
    const service = getService();
    service.listen(`test`, `task`, (err, actual) => {
      callbackCount++;
      if (callbackCount === 4) {
        Changes.args[0][0].callback({
          deleted: true,
          id: 1
        });
      } else if (callbackCount === 5 || callbackCount === 6 || callbackCount === 7) {
        expect(actual[0].contact.deleted).to.equal(true);
        if (callbackCount === 7) {
          done();
        }
      }
    });
  });

  it(`updates when a report is deleted`, done => {

    const dataRecords = [
      {
        _id: 2,
        form: `P`,
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      },
      {
        _id: 3,
        form: `P`,
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    const contacts = [
      { _id: 1, name: `Jenny` }
    ];

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves(contacts);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    let callbackCount = 0;
    const service = getService();
    service.listen(`test`, `task`, (err, actual) => {
      callbackCount++;
      if (callbackCount === 6) {
        Changes.args[0][0].callback({
          deleted: true,
          id: 2
        });
      } else if (callbackCount === 7) {
        // Both reports are still there
        expect(actual[0].reports.length).to.equal(2);
        // Report 2 is deleted
        expect(actual[0].reports[0]._id).to.equal(2);
        expect(actual[0].reports[0].deleted).to.equal(true);
        // Report 3 is not
        expect(actual[0].reports[1]._id).to.equal(3);
        expect(!!actual[0].reports[1].deleted).to.equal(false);
        done();
      }
    });
  });

  it(`updates when a contact is added`, done => {

    const dataRecords = [
      {
        _id: 2,
        form: `P`,
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    const contacts = [
      { _id: 1, name: `Jenny` }
    ];

    const newContact = { _id: 4, name: `Sarah` };

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves(contacts);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    let callbackCount = 0;
    const service = getService();
    service.listen(`test`, `task`, (err, actual) => {
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
        expect(actual[0].type).to.equal(`no-report`);
        expect(actual[0].contact._id).to.equal(4);
        done();
      }
    });
  });

  it(`updates when a report is added`, done => {

    const dataRecords = [
      {
        _id: 2,
        form: `P`,
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    const newReport = {
      _id: 3,
      form: `P`,
      reported_date: 1437618272360,
      fields: {
        patient_id: 1,
        last_menstrual_period: 10
      }
    };

    const contacts = [
      { _id: 1, name: `Jenny` }
    ];

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves(contacts);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    let callbackCount = 0;
    const service = getService();
    service.listen(`test`, `task`, (err, actual) => {
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
        expect(actual[0].reports.length).to.equal(2);
        done();
      }
    });
  });

  it(`updates when a report is added matching the contact patient_id - #3111`, done => {

    const dataRecords = [
      {
        _id: 2,
        form: `P`,
        reported_date: 1437618272360,
        fields: {
          patient_id: 1
        },
        last_menstrual_period: 10
      }
    ];

    const newReport = {
      _id: 3,
      form: `P`,
      reported_date: 1437618272360,
      fields: {
        patient_id: 1,
        last_menstrual_period: 10
      }
    };

    const contacts = [
      { _id: `some_uuid`, name: `Jenny`, patient_id: 1 }
    ];

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves(contacts);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    let callbackCount = 0;
    const service = getService();
    service.listen(`test`, `task`, (err, actual) => {
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
        expect(actual[0].reports.length).to.equal(2);
        done();
      }
    });
  });

  it(`updates when a contact is updated`, done => {

    const dataRecords = [
      {
        _id: 2,
        form: `P`,
        reported_date: 1437618272360,
        fields: {
          contact: {
            _id: 1,
            name: `Jenny`
          }
        },
        last_menstrual_period: 10
      }
    ];

    const contacts = [
      { _id: 1, name: `Jenny` }
    ];

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves(contacts);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    let callbackCount = 0;
    const service = getService();
    service.listen(`test`, `task`, (err, actual) => {
      if (err) {
        return done(err);
      }
      callbackCount++;
      if (callbackCount === 4) {
        Changes.args[0][0].callback({
          id: 1,
          doc: { _id: 1, name: `Jennifer` }
        });
      } else if (callbackCount === 5) {
        expect(actual[0].contact.name).to.equal(`Jennifer`);
        done();
      }
    });
  });

  it(`updates when a report is updated`, done => {

    const dataRecords = [
      {
        _id: 2,
        form: `P`,
        reported_date: 1437618272360,
        fields: {
          contact: {
            _id: 1,
            name: `Jenny`
          }
        },
        last_menstrual_period: 10
      }
    ];

    const contacts = [
      { _id: 1, name: `Jenny` }
    ];

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves(contacts);
    Settings.resolves({
      tasks: {
        rules,
        schedules
      }
    });
    UserContact.resolves({ name: `Jim` });

    let callbackCount = 0;
    const service = getService();
    service.listen(`test`, `task`, (err, actual) => {
      if (err) {
        return done(err);
      }
      callbackCount++;
      if (callbackCount === 4) {
        Changes.args[0][0].callback({
          id: 2,
          doc: {
            _id: 2,
            form: `P`,
            reported_date: 1437618272360,
            fields: {
              patient_id: 1,
              last_menstrual_period: 15
            }
          }
        });
      } else if (callbackCount === 5) {
        expect(actual[0].doc.fields.last_menstrual_period).to.equal(15);
        done();
      }
    });
  });

  it('reports are grouped by contact.id even if contact doc is not present', () => {
    const dataRecords = [
      {
        _id: 2,
        form: `myform`,
        reported_date: 1,
        patient_id: '1',
      },
      {
        _id: 3,
        form: `myform`,
        reported_date: 2,
        patient_id: '1',
      },
    ];

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves([]);
    Settings.resolves({
      tasks: { rules, schedules },
    });
    UserContact.resolves({ name: `Jim` });

    const service = getService();

    return service.init.then(() => {
      const facts = service._getSession().getFacts();
      expect(facts).to.deep.eq([{
        contact: { _id: '1' },
        reports: dataRecords,
      }]);
    });
  });

  it('reports are not grouped when reports have no contact id', () => {
    const dataRecords = [
      {
        _id: 2,
        form: `myform`,
        reported_date: 1,
      },
      {
        _id: 3,
        form: `myform`,
        reported_date: 2,
      },
    ];

    Search.onFirstCall().resolves(dataRecords);
    Search.onSecondCall().resolves([]);
    Settings.resolves({
      tasks: { rules, schedules },
    });
    UserContact.resolves({ name: `Jim` });

    const service = getService();
    return service.init.then(() => {
      const facts = service._getSession().getFacts();
      expect(facts).to.deep.eq([
        {
          contact: undefined,
          reports: [
            {
              _id: 2,
              form: 'myform',
              reported_date: 1
            }
          ]
        },
        {
          contact: undefined,
          reports: [
            {
              _id: 3,
              form: 'myform',
              reported_date: 2
            }
          ]
        }
      ]);
    });
  });

});
