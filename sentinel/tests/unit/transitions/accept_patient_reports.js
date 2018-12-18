require('chai').should();
const sinon = require('sinon'),
  moment = require('moment'),
  db = require('../../../src/db-pouch'),
  utils = require('../../../src/lib/utils'),
  config = require('../../../src/config'),
  transition = require('../../../src/transitions/accept_patient_reports'),
  messages = require('../../../src/lib/messages');

describe('accept_patient_reports', () => {
  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('filter', () => {
    it('empty doc returns false', () => {
      transition.filter({}).should.equal(false);
    });
    it('no type returns false', () => {
      transition.filter({ form: 'x' }).should.equal(false);
    });
    it('returns true', () => {
      sinon.stub(config, 'get').returns([{ form: 'x' }, { form: 'z' }]);
      transition
        .filter({
          form: 'x',
          type: 'data_record',
          reported_date: 1,
        })
        .should.equal(true);
    });
  });

  describe('onMatch', () => {
    it('callback empty if form not included', done => {
      sinon.stub(config, 'get').returns([{ form: 'x' }, { form: 'z' }]);
      const change = {
        doc: {
          form: 'y',
        },
      };
      transition.onMatch(change).then(changed => {
        (typeof changed).should.equal('undefined');
        done();
      });
    });

    it('with no patient id adds error msg and response', done => {
      sinon.stub(config, 'get').returns([{ form: 'x' }, { form: 'z' }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([]);

      const doc = {
        form: 'x',
        fields: { patient_id: 'x' },
      };

      transition.onMatch({ doc: doc }).then(() => {
        doc.errors.length.should.equal(1);
        doc.errors[0].message.should.equal(
          'messages.generic.registration_not_found'
        );
        done();
      });
    });
  });

  describe('handleReport', () => {
    // Because patients can be created through the UI and not necessarily have
    // a registration at all
    it('with no registrations does not error', done => {
      const doc = {
        fields: { patient_id: 'x' },
        from: '+123',
        patient: { patient_id: 'x' }
      };
      sinon.stub(utils, 'getSubjectIds').returns(['x', 'y']);
      sinon.stub(utils, 'getReportsBySubject').resolves([]);

      const config = {
        messages: [
          {
            event_type: 'registration_not_found',
            message: [
              {
                content: 'not found {{patient_id}}',
                locale: 'en',
              },
            ],
            recipient: 'reporting_unit',
          },
        ],
      };

      transition._handleReport(doc, config, () => {
        (typeof doc.errors).should.equal('undefined');
        (typeof doc.tasks).should.equal('undefined');
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getReportsBySubject.args[0].should.deep.equal([{ ids: ['x', 'y'], registrations: true }]);
        utils.getSubjectIds.callCount.should.equal(1);
        utils.getSubjectIds.args[0].should.deep.equal([doc.patient]);
        done();
      });
    });

    it('with patient adds reply', done => {
      const patient = { patient_name: 'Archibald' };
      const doc = {
        fields: { patient_id: '559' },
        contact: {
          phone: '+1234',
          name: 'woot',
          parent: {
            contact: {
              phone: '+1234',
              name: 'woot',
            },
          },
        },
        patient: patient,
      };
      sinon.stub(utils, 'getReportsBySubject').resolves([]);
      const config = {
        messages: [
          {
            event_type: 'report_accepted',
            message: [
              {
                content:
                  'Thank you, {{contact.name}}. ANC visit for {{patient_name}} ({{patient_id}}) has been recorded.',
                locale: 'en',
              },
            ],
            recipient: 'reporting_unit',
          },
        ],
      };
      transition._handleReport(doc, config, () => {
        doc.tasks[0].messages[0].message.should.equal(
          'Thank you, woot. ANC visit for Archibald (559) has been recorded.'
        );
        done();
      });
    });

    it('adding silence_type to handleReport calls _silenceReminders', done => {
      sinon.stub(transition, '_silenceReminders').callsArgWith(3);
      const doc = { _id: 'a', fields: { patient_id: 'x' } };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        { _id: 'a' }, // should not be silenced as it's the doc being processed
        { _id: 'b' }, // should be silenced
        { _id: 'c' }, // should be silenced
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);

      transition._handleReport(doc, config, (err, complete) => {
        complete.should.equal(true);
        transition._silenceReminders.callCount.should.equal(2);
        transition._silenceReminders.args[0][0]._id.should.equal('b');
        transition._silenceReminders.args[0][1]._id.should.equal('a');
        transition._silenceReminders.args[1][0]._id.should.equal('c');
        transition._silenceReminders.args[1][1]._id.should.equal('a');
        done();
      });
    });

    it('adds registration_id property', done => {
      sinon.stub(transition, '_silenceReminders').callsArgWith(3, null, true);
      const doc = { _id: 'z', fields: { patient_id: 'x' } };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        { _id: 'a', reported_date: '2017-02-05T09:23:07.853Z' },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);

      transition._handleReport(doc, config, (err, complete) => {
        complete.should.equal(true);
        doc.registration_id.should.equal(registrations[0]._id);
        done();
      });
    });

    it('if there are multiple registrations uses the latest one', done => {
      sinon.stub(transition, '_silenceReminders').callsArgWith(3, null, true);
      const doc = { _id: 'z', fields: { patient_id: 'x' } };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        { _id: 'a', reported_date: '2017-02-05T09:23:07.853Z' },
        { _id: 'c', reported_date: '2018-02-05T09:23:07.853Z' },
        { _id: 'b', reported_date: '2016-02-05T09:23:07.853Z' },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);

      transition._handleReport(doc, config, (err, complete) => {
        complete.should.equal(true);
        doc.registration_id.should.equal(registrations[1]._id);
        done();
      });
    });

    it('adds report_uuid property', done => {
      const putRegistration = sinon.stub(db.medic, 'put');
      putRegistration.callsArg(1);
      sinon.stub(transition, '_silenceReminders').callsArgWith(3, null, true);
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        reported_date: '2018-09-28T18:45:00.000Z',
      };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2019-02-26T18:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k5',
                },
              ],
            },
            {
              due: '2018-09-26T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k',
                },
              ],
            },
            {
              due: '2018-10-26T18:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'j',
                },
              ],
            },
          ],
        },
      ];

      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      transition._handleReport(doc, config, (err, complete) => {
        complete.should.equal(true);
        putRegistration.callCount.should.equal(1);
        registrations[0].scheduled_tasks[1].report_uuid.should.equal(doc._id);
        done();
      });
    });

    it('if there are multiple scheduled tasks uses the oldest valid one', done => {
      const putRegistration = sinon.stub(db.medic, 'put');
      putRegistration.callsArg(1);
      sinon.stub(transition, '_silenceReminders').callsArgWith(3, null, true);
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        reported_date: '2019-01-10T18:45:00.000Z',
      };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2018-09-26T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k1',
                },
              ],
            },
            {
              due: '2018-11-26T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k2',
                },
              ],
            },
            {
              due: '2018-12-26T18:45:00.000Z',
              state: 'delivered',
              messages: [
                {
                  uuid: 'k3',
                },
              ],
            },
            {
              due: '2019-01-26T18:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k4',
                },
              ],
            },
          ],
        },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      transition._handleReport(doc, config, (err, complete) => {
        complete.should.equal(true);
        putRegistration.callCount.should.equal(1);
        registrations[0].scheduled_tasks[2].report_uuid.should.equal(doc._id);
        done();
      });
    });


    it('should catch utils.getReportsBySubject errors', done => {
      sinon.stub(utils, 'getReportsBySubject').rejects({ some: 'error' });
      sinon.stub(utils, 'getSubjectIds').returns(['a', 'b']);

      transition._handleReport({}, {}, (err, complete) => {
        (!!complete).should.equal(false);
        err.should.deep.equal({ some: 'error' });
        utils.getReportsBySubject.callCount.should.equal(1);
        done();
      });
    });
  });

  describe('silenceReminders', () => {
    it('Sets tasks to cleared and saves them', done => {
      const reportId = 'reportid';
      const report = {
        _id: reportId,
        reported_date: 123,
      };
      const registration = {
        _id: 'test-registration',
        scheduled_tasks: [
          { state: 'scheduled' },
          { state: 'scheduled' },
          { state: 'pending' },
          { state: 'muted' }
        ],
      };

      sinon
        .stub(transition, '_findToClear')
        .returns(registration.scheduled_tasks);
      const setTaskState = sinon.stub(utils, 'setTaskState');
      sinon.stub(db.medic, 'post').callsArg(1);

      transition._silenceReminders(registration, report, null, () => {
        registration._id.should.equal('test-registration');
        registration.scheduled_tasks.length.should.equal(4);
        setTaskState.callCount.should.equal(4);
        setTaskState
          .getCall(0)
          .args.should.deep.equal([
            { state: 'scheduled', cleared_by: reportId },
            'cleared',
          ]);
        setTaskState
          .getCall(1)
          .args.should.deep.equal([
            { state: 'scheduled', cleared_by: reportId },
            'cleared',
          ]);
        setTaskState
          .getCall(2)
          .args.should.deep.equal([
            { state: 'pending', cleared_by: reportId },
            'cleared',
          ]);

        setTaskState.getCall(3).args.should.deep.equal([{ state: 'muted', cleared_by: reportId }, 'cleared']);
        registration.scheduled_tasks[0].cleared_by.should.equal(reportId);
        registration.scheduled_tasks[1].cleared_by.should.equal(reportId);
        registration.scheduled_tasks[2].cleared_by.should.equal(reportId);
        registration.scheduled_tasks[3].cleared_by.should.equal(reportId);
        done();
      });
    });
  });

  describe('findToClear', () => {
    const ids = ts => ts.map(t => t._id);

    it('returns no tasks on registrations with none', () => {
      const registration = {
        scheduled_tasks: [],
      };

      transition
        ._findToClear(registration, new Date(), { silence_type: 'test' })
        .should.deep.equal([]);
      transition
        ._findToClear(registration, new Date(), {
          silence_type: 'test',
          silence_for: '1000 years',
        })
        .should.deep.equal([]);
    });
    describe('without silence_for range', () => {
      const now = moment();
      const registration = {
        scheduled_tasks: [
          {
            _id: 1,
            due: now.clone().subtract(1, 'days'),
            state: 'pending',
            group: 1,
            type: 'x',
          },
          {
            _id: 2,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 1,
            type: 'x',
          },
          {
            _id: 3,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'x',
          },
          {
            _id: 4,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'y',
          },
          {
            _id: 5,
            due: now.clone().add(1, 'days'),
            state: 'not-scheduled',
            group: 2,
            type: 'y',
          },
          {
            _id: 6,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 3,
            type: 'y',
          },
        ],
      };

      it('returns all scheduled or pending scheduled_tasks of the given type', () => {
        const results = transition._findToClear(registration, now.valueOf(), {
          silence_type: 'x',
        });
        ids(results).should.deep.equal([1, 2, 3]);
      });
      it('or multiple types', () => {
        const results = transition._findToClear(registration, now.valueOf(), {
          silence_type: 'x,y',
        });
        ids(results).should.deep.equal([1, 2, 3, 4, 6]);
      });
    });
    describe('with silence_for range', () => {
      const now = moment();
      const silence_for = '5 days';
      const registration = {
        scheduled_tasks: [
          // A group with a task before, and after, but not within range
          {
            _id: 1,
            due: now.clone().subtract(1, 'days'),
            state: 'sent',
            group: 1,
            type: 'x',
          },
          {
            _id: 2,
            due: now.clone().add(9, 'days'),
            state: 'scheduled',
            group: 1,
            type: 'x',
          },
          // A group with a task in range and subsequent tasks out of range
          {
            _id: 3,
            due: now.clone().add(1, 'days'),
            state: 'pending',
            group: 2,
            type: 'x',
          },
          {
            _id: 4,
            due: now.clone().add(9, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'x',
          },
          // A group that overlaps with the above group and is also a valid group
          {
            _id: 31,
            due: now.clone().add(2, 'days'),
            state: 'scheduled',
            group: 21,
            type: 'x',
          },
          {
            _id: 41,
            due: now.clone().add(10, 'days'),
            state: 'scheduled',
            group: 21,
            type: 'x',
          },
          // A group with no tasks in range
          {
            _id: 5,
            due: now.clone().add(9, 'days'),
            state: 'scheduled',
            group: 3,
            type: 'x',
          },
          // A group in range but of a different type
          {
            _id: 6,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'y',
          },
          {
            _id: 7,
            due: now.clone().add(9, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'y',
          },
        ],
      };
      it('returns all scheduled or pending scheduled_tasks that are in groups with at least one task in the given range', () => {
        const results = transition._findToClear(registration, now.valueOf(), {
          silence_type: 'x',
          silence_for: silence_for,
        });
        ids(results).should.deep.equal([1, 2, 3, 4, 31, 41]);
      });
      it('also with multiple types', () => {
        const results = transition._findToClear(registration, now.valueOf(), {
          silence_type: 'x,y',
          silence_for: silence_for,
        });
        ids(results).should.deep.equal([1, 2, 3, 4, 31, 41, 6, 7]);
      });
    });
  });

  describe('addMessageToDoc', () => {
    it('Does not add a message if the bool_expr fails', () => {
      const doc = {};
      const config = {
        messages: [
          {
            event_type: 'report_accepted',
            bool_expr: 'false',
          },
        ],
      };
      const stub = sinon.stub(messages, 'addMessage');
      transition._addMessageToDoc(doc, config, []);
      stub.callCount.should.equal(0);
    });
    it('Adds a message if the bool_expr passes', () => {
      const doc = {};
      const config = {
        messages: [
          {
            event_type: 'report_accepted',
            bool_expr: 'true',
          },
        ],
      };
      const stub = sinon.stub(messages, 'addMessage');
      transition._addMessageToDoc(doc, config, []);
      stub.callCount.should.equal(1);
    });
  });
});
