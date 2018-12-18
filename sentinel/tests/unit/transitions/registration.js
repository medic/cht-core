const should = require('chai').should(),
  sinon = require('sinon'),
  db = require('../../../src/db-nano'),
  dbPouch = require('../../../src/db-pouch'),
  transition = require('../../../src/transitions/registration'),
  schedules = require('../../../src/lib/schedules'),
  messages = require('../../../src/lib/messages'),
  utils = require('../../../src/lib/utils'),
  config = require('../../../src/config'),
  transitionUtils = require('../../../src/transitions/utils'),
  acceptPatientReports = require('../../../src/transitions/accept_patient_reports');

describe('registration', () => {
  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('booleanExpressionFails', () => {
    it('is false if there is no valid expression', () => {
      transition._booleanExpressionFails({}, '').should.equal(false);
    });

    it('is true if the expresison fails', () => {
      transition
        ._booleanExpressionFails({ foo: 'bar' }, `doc.foo !== 'bar'`)
        .should.equal(true);
    });

    it('is true if the expression is invalid', () => {
      // TODO: should this error instead of just returning false?
      //       If there is a typo we're not going to know about it
      transition
        ._booleanExpressionFails({}, `doc.foo.bar === 'smang'`)
        .should.equal(true);
    });
  });

  describe('addPatient', () => {
    it('trigger creates a new patient', done => {
      const patientName = 'jack';
      const submitterId = 'abc';
      const parentId = 'papa';
      const patientId = '05649';
      const reportId = 'def';
      const senderPhoneNumber = '+555123';
      const dob = '2017-03-31T01:15:09.000Z';
      const change = {
        doc: {
          _id: reportId,
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: senderPhoneNumber,
          fields: { patient_name: patientName },
          birth_date: dob,
        },
      };
      const getPatientContactUuid = sinon
        .stub(utils, 'getPatientContactUuid')
        .callsArgWith(1);
      // return expected view results when searching for contacts_by_phone
      const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, {
        rows: [
          {
            doc: {
              _id: submitterId,
              parent: { _id: parentId },
            },
          },
        ],
      });
      const saveDoc = sinon.stub(dbPouch.medic, 'post').callsArgWith(1);
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_patient' }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(transition, 'validate').callsArgWith(2);
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
      sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
        doc.patient_id = patientId;
        callback();
      });

      transition.onMatch(change).then(() => {
        getPatientContactUuid.callCount.should.equal(1);
        view.callCount.should.equal(1);
        view.args[0][0].should.equal('medic-client');
        view.args[0][1].should.equal('contacts_by_phone');
        view.args[0][2].key.should.equal(senderPhoneNumber);
        view.args[0][2].include_docs.should.equal(true);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].name.should.equal(patientName);
        saveDoc.args[0][0].parent._id.should.equal(parentId);
        saveDoc.args[0][0].reported_date.should.equal(53);
        saveDoc.args[0][0].type.should.equal('person');
        saveDoc.args[0][0].patient_id.should.equal(patientId);
        saveDoc.args[0][0].date_of_birth.should.equal(dob);
        saveDoc.args[0][0].source_id.should.equal(reportId);
        saveDoc.args[0][0].created_by.should.equal(submitterId);
        done();
      });
    });

    it('does nothing when patient already added', done => {
      const patientId = '05649';
      const change = {
        doc: {
          type: 'data_record',
          form: 'R',
          patient_id: patientId,
          reported_date: 53,
          from: '+555123',
          fields: { patient_name: 'jack' },
        },
      };
      sinon
        .stub(db.medic, 'view')
        .callsArgWith(3, null, {
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      const saveDoc = sinon.stub(dbPouch.medic, 'post').callsArgWith(1);
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_patient_id' }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(transition, 'validate').callsArgWith(2);
      transition.onMatch(change).then(() => {
        saveDoc.callCount.should.equal(0);
        done();
      });
    });

    it('uses a given id if configured to', done => {
      const patientId = '05648';
      const doc = {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: '+555123',
        fields: { patient_name: 'jack', external_id: patientId },
        birth_date: '2017-03-31T01:15:09.000Z',
      };
      const change = { doc: doc };
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1);
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'view')
        .callsArgWith(3, null, {
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      const saveDoc = sinon.stub(dbPouch.medic, 'post').callsArgWith(1);
      const eventConfig = {
        form: 'R',
        events: [
          {
            name: 'on_create',
            trigger: 'add_patient_id',
            params: '{"patient_id_field": "external_id"}',
          },
        ],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(transition, 'validate').callsArgWith(2);
      sinon.stub(transitionUtils, 'isIdUnique').callsArgWith(2, null, true);

      transition.onMatch(change).then(() => {
        saveDoc.args[0][0].patient_id.should.equal(patientId);
        doc.patient_id.should.equal(patientId);
        (typeof doc.errors).should.equal('undefined');
        done();
      });
    });

    it('errors if the configuration doesnt point to an id', done => {
      const patientId = '05648';
      const doc = {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: '+555123',
        fields: { patient_name: 'jack', external_id: patientId },
        birth_date: '2017-03-31T01:15:09.000Z',
      };
      const change = { doc: doc };
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1);
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'view')
        .callsArgWith(3, null, {
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      sinon.stub(dbPouch.medic, 'post').callsArgWith(1);
      const eventConfig = {
        form: 'R',
        events: [
          {
            name: 'on_create',
            trigger: 'add_patient',
            params: '{"patient_id_field": "not_the_external_id"}',
          },
        ],
      };
      const configGet = sinon.stub(config, 'get');
      configGet.withArgs('outgoing_deny_list').returns('');
      configGet.returns([eventConfig]);

      sinon.stub(transition, 'validate').callsArgWith(2);

      transition.onMatch(change).then(() => {
        (typeof doc.patient_id).should.equal('undefined');
        doc.errors.should.deep.equal([
          {
            message: 'messages.generic.no_provided_patient_id',
            code: 'no_provided_patient_id',
          },
        ]);
        done();
      });
    });

    it('errors if the given id is not unique', done => {
      const patientId = '05648';
      const doc = {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: '+555123',
        fields: { patient_name: 'jack', external_id: patientId },
        birth_date: '2017-03-31T01:15:09.000Z',
      };
      const change = { doc: doc };
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1);
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'view')
        .callsArgWith(3, null, {
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      sinon.stub(dbPouch.medic, 'post').callsArgWith(1);
      const eventConfig = {
        form: 'R',
        events: [
          {
            name: 'on_create',
            trigger: 'add_patient',
            params: '{"patient_id_field": "external_id"}',
          },
        ],
      };
      const configGet = sinon.stub(config, 'get');
      configGet.withArgs('outgoing_deny_list').returns('');
      configGet.returns([eventConfig]);

      sinon.stub(transitionUtils, 'isIdUnique').callsArgWith(2, null, false);

      sinon.stub(transition, 'validate').callsArgWith(2);

      transition.onMatch(change).then(() => {
        (typeof doc.patient_id).should.be.equal('undefined');
        doc.errors.should.deep.equal([
          {
            message: 'messages.generic.provided_patient_id_not_unique',
            code: 'provided_patient_id_not_unique',
          },
        ]);
        done();
      });
    });

    it('event parameter overwrites the default property for the name of the patient', done => {
      const patientName = 'jack';
      const submitterId = 'papa';
      const patientId = '05649';
      const senderPhoneNumber = '+555123';
      const dob = '2017-03-31T01:15:09.000Z';
      const change = {
        doc: {
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: senderPhoneNumber,
          fields: { name: patientName },
          birth_date: dob,
        },
      };
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1);
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'view')
        .callsArgWith(3, null, {
          rows: [{ doc: { parent: { _id: submitterId } } }],
        });
      const saveDoc = sinon.stub(dbPouch.medic, 'post').callsArgWith(1);
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_patient', params: 'name' }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(transition, 'validate').callsArgWith(2);
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

      sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
        doc.patient_id = patientId;
        callback();
      });

      transition.onMatch(change).then(() => {
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].name.should.equal(patientName);
        done();
      });
    });

    it('event parameter overwrites the default property for the name of the patient using JSON config', done => {
      const patientName = 'jack';
      const submitterId = 'papa';
      const patientId = '05649';
      const senderPhoneNumber = '+555123';
      const dob = '2017-03-31T01:15:09.000Z';
      const change = {
        doc: {
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: senderPhoneNumber,
          fields: { name: patientName },
          birth_date: dob,
        },
      };
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1);
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'view')
        .callsArgWith(3, null, {
          rows: [{ doc: { parent: { _id: submitterId } } }],
        });
      const saveDoc = sinon.stub(dbPouch.medic, 'post').callsArgWith(1);
      const eventConfig = {
        form: 'R',
        events: [
          {
            name: 'on_create',
            trigger: 'add_patient',
            params: '{"patient_name_field": "name"}',
          },
        ],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(transition, 'validate').callsArgWith(2);
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

      sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
        doc.patient_id = patientId;
        callback();
      });

      transition.onMatch(change).then(() => {
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].name.should.equal(patientName);
        done();
      });
    });

    it('add_patient and add_patient_id triggers are idempotent', done => {
      const patientName = 'jack';
      const submitterId = 'papa';
      const patientId = '05649';
      const senderPhoneNumber = '+555123';
      const dob = '2017-03-31T01:15:09.000Z';
      const change = {
        doc: {
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: senderPhoneNumber,
          fields: { name: patientName },
          birth_date: dob,
        },
      };
      sinon.stub(utils, 'getPatientContactUuid').callsArgWith(1);
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'view')
        .callsArgWith(3, null, {
          rows: [{ doc: { parent: { _id: submitterId } } }],
        });
      const saveDoc = sinon.stub(dbPouch.medic, 'post').callsArgWith(1);
      const eventConfig = {
        form: 'R',
        events: [
          { name: 'on_create', trigger: 'add_patient', params: 'name' },
          { name: 'on_create', trigger: 'add_patient_id', params: 'name' },
        ],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(transition, 'validate').callsArgWith(2);
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

      sinon.stub(transitionUtils, 'addUniqueId').callsFake((doc, callback) => {
        doc.patient_id = patientId;
        callback();
      });

      transition.onMatch(change).then(() => {
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].name.should.equal(patientName);
        done();
      });
    });

    it('fails when patient_id_field is set to patient_id', done => {
      const eventConfig = [
        {
          form: 'R',
          events: [
            {
              name: 'on_create',
              trigger: 'add_patient',
              params: '{ "patient_id_field": "patient_id" }',
            },
          ],
        },
      ];

      sinon.stub(config, 'get').returns(eventConfig);
      try {
        transition.init();
        done(new Error('Expected validation error'));
      } catch (e) {
        (e instanceof Error).should.equal(true);
        e.message.should.equal(
          'Configuration error. patient_id_field cannot be set to patient_id'
        );
        done();
      }
    });
  });

  describe('assign_schedule', () => {
    it('event creates the named schedule', done => {
      const change = {
        doc: {
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+555123',
          fields: { patient_id: '05649' },
        },
      };
      sinon
        .stub(db.medic, 'view')
        .callsArgWith(3, null, {
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      sinon.stub(dbPouch.medic, 'post').callsArgWith(1);
      const eventConfig = {
        form: 'R',
        events: [
          {
            name: 'on_create',
            trigger: 'assign_schedule',
            params: 'myschedule',
          },
        ],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(transition, 'validate').callsArgWith(2);
      const getRegistrations = sinon
        .stub(utils, 'getRegistrations')
        .callsArgWith(1, null, [{ _id: 'xyz' }]);
      sinon.stub(schedules, 'getScheduleConfig').returns('someschedule');
      sinon
        .stub(utils, 'getPatientContactUuid')
        .callsArgWith(1, null, { _id: 'uuid' });
      const assignSchedule = sinon
        .stub(schedules, 'assignSchedule')
        .returns(true);
      transition.onMatch(change).then(() => {
        assignSchedule.callCount.should.equal(1);
        assignSchedule.args[0][1].should.equal('someschedule');
        assignSchedule.args[0][2][0]._id.should.equal('xyz');
        getRegistrations.callCount.should.equal(1);
        done();
      });
    });
  });

  describe('filter', () => {
    it('returns false for reports for unknown json form', done => {
      const doc = { form: 'R', type: 'data_record' };
      const getForm = sinon.stub(utils, 'getForm').returns(null);
      const actual = transition.filter(doc);
      getForm.callCount.should.equal(1);
      getForm.args[0][0].should.equal('R');
      actual.should.equal(false);
      done();
    });

    it('returns false for reports with no registration configured', done => {
      const doc = { form: 'R', type: 'data_record' };
      const getForm = sinon
        .stub(utils, 'getForm')
        .returns({ public_form: false });
      const configGet = sinon.stub(config, 'get').returns([{ form: 'XYZ' }]);
      const actual = transition.filter(doc);
      getForm.callCount.should.equal(1);
      getForm.args[0][0].should.equal('R');
      configGet.callCount.should.equal(1);
      configGet.args[0][0].should.equal('registrations');
      actual.should.equal(false);
      done();
    });

    it('returns true for reports from known clinic', done => {
      const doc = { form: 'R', type: 'data_record' };
      const getForm = sinon
        .stub(utils, 'getForm')
        .returns({ public_form: false });
      const configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
      const getClinicPhone = sinon
        .stub(utils, 'getClinicPhone')
        .returns('+55555555');
      const actual = transition.filter(doc);
      getForm.callCount.should.equal(1);
      getForm.args[0][0].should.equal('R');
      configGet.callCount.should.equal(1);
      configGet.args[0][0].should.equal('registrations');
      getClinicPhone.callCount.should.equal(1);
      actual.should.equal(true);
      done();
    });

    it('returns false for reports from unknown clinic', done => {
      const doc = { form: 'R', type: 'data_record' };
      const getForm = sinon
        .stub(utils, 'getForm')
        .returns({ public_form: false });
      const configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
      const getClinicPhone = sinon.stub(utils, 'getClinicPhone').returns(null);
      const actual = transition.filter(doc);
      getForm.callCount.should.equal(1);
      getForm.args[0][0].should.equal('R');
      configGet.callCount.should.equal(1);
      configGet.args[0][0].should.equal('registrations');
      getClinicPhone.callCount.should.equal(1);
      actual.should.equal(false);
      done();
    });

    it('returns true for reports for public forms from unknown clinic', done => {
      const doc = { form: 'R', type: 'data_record' };
      const getForm = sinon
        .stub(utils, 'getForm')
        .returns({ public_form: true });
      const configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
      const getClinicPhone = sinon.stub(utils, 'getClinicPhone').returns(null);
      const actual = transition.filter(doc);
      getForm.callCount.should.equal(1);
      getForm.args[0][0].should.equal('R');
      configGet.callCount.should.equal(1);
      configGet.args[0][0].should.equal('registrations');
      getClinicPhone.callCount.should.equal(1);
      actual.should.equal(true);
      done();
    });

    it('returns true for xforms reports', done => {
      const doc = { form: 'R', content_type: 'xml', type: 'data_record' };
      const getForm = sinon.stub(utils, 'getForm').returns(null);
      const configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
      const actual = transition.filter(doc);
      getForm.callCount.should.equal(1);
      getForm.args[0][0].should.equal('R');
      configGet.callCount.should.equal(1);
      configGet.args[0][0].should.equal('registrations');
      actual.should.equal(true);
      done();
    });
  });

  describe('trigger param configuration', () => {
    it('supports strings', done => {
      const eventConfig = {
        form: 'R',
        events: [
          { name: 'on_create', trigger: 'testparamparsing', params: 'foo' },
        ],
      };

      transition.triggers.testparamparsing = (options, cb) => {
        cb(options);
      };

      transition.fireConfiguredTriggers(eventConfig, {}).catch(options => {
        options.params.should.deep.equal(['foo']);
        done();
      });
    });

    it('supports comma-delimited strings as array', done => {
      const eventConfig = {
        form: 'R',
        events: [
          { name: 'on_create', trigger: 'testparamparsing', params: 'foo,bar' },
        ],
      };

      transition.triggers.testparamparsing = (options, cb) => {
        cb(options);
      };

      transition.fireConfiguredTriggers(eventConfig, {}).catch(options => {
        options.params.should.deep.equal(['foo', 'bar']);
        done();
      });
    });

    it('supports arrays as a string', done => {
      const eventConfig = {
        form: 'R',
        events: [
          {
            name: 'on_create',
            trigger: 'testparamparsing',
            params: '["foo","bar", 3]',
          },
        ],
      };

      transition.triggers.testparamparsing = (options, cb) => {
        cb(options);
      };

      transition.fireConfiguredTriggers(eventConfig, {}).catch(options => {
        options.params.should.deep.equal(['foo', 'bar', 3]);
        done();
      });
    });

    it('supports JSON as a string', done => {
      const eventConfig = {
        form: 'R',
        events: [
          {
            name: 'on_create',
            trigger: 'testparamparsing',
            params: '{"foo": "bar"}',
          },
        ],
      };

      transition.triggers.testparamparsing = (options, cb) => {
        cb(options);
      };

      transition.fireConfiguredTriggers(eventConfig, {}).catch(options => {
        options.params.should.deep.equal({ foo: 'bar' });
        done();
      });
    });

    it('supports direct JSON', done => {
      const eventConfig = {
        form: 'R',
        events: [
          {
            name: 'on_create',
            trigger: 'testparamparsing',
            params: { foo: 'bar' },
          },
        ],
      };

      transition.triggers.testparamparsing = (options, cb) => {
        cb(options);
      };

      transition.fireConfiguredTriggers(eventConfig, {}).catch(options => {
        options.params.should.deep.equal({ foo: 'bar' });
        done();
      });
    });

    it('fails with no parameters', done => {
      const eventConfig = [
        {
          form: 'R',
          events: [
            {
              name: 'on_create',
              trigger: 'assign_schedule',
              params: '',
            },
          ],
        },
      ];

      sinon.stub(config, 'get').returns(eventConfig);
      try {
        transition.init();
        done(new Error('Expected validation error'));
      } catch (e) {
        (e instanceof Error).should.equal(true);
        e.message.should.equal(
          'Configuration error. Expecting params to be defined as the name of the schedule(s) for R.assign_schedule'
        );
        done();
      }
    });

    it('fails with object parameters', done => {
      const eventConfig = [
        {
          form: 'R',
          events: [
            {
              name: 'on_create',
              trigger: 'assign_schedule',
              params: '{ "name": "hello" }',
            },
          ],
        },
      ];

      sinon.stub(config, 'get').returns(eventConfig);
      try {
        transition.init();
        done(new Error('Expected validation error'));
      } catch (e) {
        (e instanceof Error).should.equal(true);
        e.message.should.equal(
          'Configuration error. Expecting params to be a string, comma separated list, or an array for R.assign_schedule: \'{ "name": "hello" }\''
        );
        done();
      }
    });

    it('succeeds with array parameters', done => {
      const eventConfig = [
        {
          form: 'R',
          events: [
            {
              name: 'on_create',
              trigger: 'assign_schedule',
              params: 'a,b',
            },
          ],
        },
      ];

      sinon.stub(config, 'get').returns(eventConfig);
      transition.init();
      done();
    });

    it('parse failure for invalid JSON propagates to the callbacks', done => {
      const eventConfig = [
        {
          form: 'R',
          events: [
            {
              name: 'on_create',
              trigger: 'testparamparsing',
              params: '{"foo": "bar"', // missing end "}"
            },
          ],
        },
      ];

      sinon.stub(config, 'get').returns(eventConfig);
      try {
        transition.init();
        done(new Error('Expected validation error'));
      } catch (e) {
        (e instanceof Error).should.equal(true);
        e.message.should.equal(
          'Configuration error. Unable to parse params for R.testparamparsing: \'{"foo": "bar"\'. Error: SyntaxError: Unexpected end of JSON input'
        );
        done();
      }
    });
  });

  describe('addMessages', () => {
    it('prepops and passes the right information to messages.addMessage', done => {
      const testPhone = '1234',
        testMessage1 = {
          message: 'A Test Message 1',
          recipient: testPhone,
          event_type: 'report_accepted',
        },
        testMessage2 = {
          message: 'A Test Message 2',
          recipient: testPhone,
          event_type: 'report_accepted',
        },
        testRegistration = 'some registrations',
        testPatient = 'a patient contact';

      const addMessage = sinon.stub(messages, 'addMessage');

      sinon
        .stub(utils, 'getRegistrations')
        .callsArgWith(1, null, testRegistration);

      const testConfig = { messages: [testMessage1, testMessage2] };
      const testDoc = {
        fields: {
          patient_id: '12345',
        },
        patient: testPatient,
      };

      transition.addMessages(testConfig, testDoc, err => {
        should.not.exist(err);
        // Registration will send messages with no event_type
        addMessage.callCount.should.equal(2);

        const expectedContext = {
          patient: testPatient,
          registrations: testRegistration,
          templateContext: {
            next_msg: {
              minutes: 0,
              hours: 0,
              days: 0,
              weeks: 0,
              months: 0,
              years: 0,
            },
          },
        };
        addMessage.args[0][0].should.equal(testDoc);
        addMessage.args[0][1].should.equal(testMessage1);
        addMessage.args[0][2].should.equal(testPhone);
        addMessage.args[0][3].should.deep.equal(expectedContext);
        addMessage.args[1][0].should.equal(testDoc);
        addMessage.args[1][1].should.equal(testMessage2);
        addMessage.args[1][2].should.equal(testPhone);
        addMessage.args[1][3].should.deep.equal(expectedContext);
        done();
      });
    });
    it('supports ignoring messages based on bool_expr', done => {
      const testPhone = '1234',
        testMessage1 = {
          message: 'A Test Message 1',
          recipient: testPhone,
          event_type: 'report_accepted',
        },
        testMessage2 = {
          message: 'A Test Message 2',
          recipient: testPhone,
          event_type: 'report_accepted',
          bool_expr: '1 === 2',
        },
        testRegistration = 'some registrations',
        testPatient = 'a patient contact';

      const addMessage = sinon.stub(messages, 'addMessage');

      sinon
        .stub(utils, 'getRegistrations')
        .callsArgWith(1, null, testRegistration);

      const testConfig = { messages: [testMessage1, testMessage2] };
      const testDoc = {
        fields: {
          patient_id: '12345',
        },
        patient: testPatient,
      };

      transition.addMessages(testConfig, testDoc, err => {
        should.not.exist(err);
        addMessage.callCount.should.equal(1);
        const expectedContext = {
          patient: testPatient,
          registrations: testRegistration,
          templateContext: {
            next_msg: {
              minutes: 0,
              hours: 0,
              days: 0,
              weeks: 0,
              months: 0,
              years: 0,
            },
          },
        };
        addMessage.args[0][0].should.equal(testDoc);
        addMessage.args[0][1].should.equal(testMessage1);
        addMessage.args[0][2].should.equal(testPhone);
        addMessage.args[0][3].should.deep.equal(expectedContext);
        done();
      });
    });
  });

  describe('clear_schedule', () => {
    it('should work when doc has no patient', done => {
      sinon.stub(utils, 'getReportsBySubject').resolves([]);

      transition.triggers.clear_schedule({ doc: {}, params: [] }, err => {
        (!!err).should.equal(false);
        done();
      });
    });

    it('should query utils.getReportsBySubject with correct params', done => {
      sinon.stub(utils, 'getReportsBySubject').resolves([]);
      sinon.stub(utils, 'getSubjectIds').returns(['uuid', 'patient_id']);
      const doc = { patient: { _id: 'uuid', patient_id: 'patient_id' } };
      sinon.stub(acceptPatientReports, 'silenceRegistrations').callsArgWith(3, null);

      transition.triggers.clear_schedule({ doc, params: [] }, err => {
        (!!err).should.equal(false);
        utils.getSubjectIds.callCount.should.equal(1);
        utils.getSubjectIds.args[0].should.deep.equal([doc.patient]);
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getReportsBySubject.args[0].should.deep.equal([ {
          ids: ['uuid', 'patient_id'],
          registrations: true
        } ]);
        done();
      });
    });

    it('should call silenceRegistrations with correct params', done => {
      const doc = { _id: 'uuid', patient_id: 'patient_id' },
            params = ['1', '2', '3', '4'],
            registrations = ['a', 'b', 'c'];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      sinon.stub(utils, 'getSubjectIds').returns(['uuid', 'patient_id']);
      sinon.stub(acceptPatientReports, 'silenceRegistrations').callsArgWith(3, null);

      transition.triggers.clear_schedule({ doc, params }, err => {
        (!!err).should.equal(false);
        acceptPatientReports.silenceRegistrations.callCount.should.equal(1);
        acceptPatientReports.silenceRegistrations.args[0][0].should.deep.equal({
          silence_type: '1,2,3,4',
          silence_for: null
        });
        acceptPatientReports.silenceRegistrations.args[0][1].should.deep.equal(doc);
        acceptPatientReports.silenceRegistrations.args[0][2].should.deep.equal(registrations);
        done();
      });
    });

    it('should catch getReportsBySubject errors', done => {
      sinon.stub(utils, 'getReportsBySubject').rejects({ some: 'error' });
      sinon.stub(utils, 'getSubjectIds').returns([]);
      sinon.stub(acceptPatientReports, 'silenceRegistrations');

      transition.triggers.clear_schedule({ doc: {}, params: [] }, err => {
        err.should.deep.equal({ some: 'error' });
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getSubjectIds.callCount.should.equal(1);
        acceptPatientReports.silenceRegistrations.callCount.should.equal(0);
        done();
      });
    });

    it('should catch silenceRegistrations errors', done => {
      sinon.stub(utils, 'getReportsBySubject').resolves([]);
      sinon.stub(utils, 'getSubjectIds').returns([]);
      sinon.stub(acceptPatientReports, 'silenceRegistrations').callsArgWith(3, { some: 'err' });
      transition.triggers.clear_schedule({ doc: {}, params: [] }, err => {
        err.should.deep.equal({ some: 'err' });
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getSubjectIds.callCount.should.equal(1);
        acceptPatientReports.silenceRegistrations.callCount.should.equal(1);
        done();
      });
    });
  });
});
