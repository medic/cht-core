require('chai').should();
const sinon = require('sinon');
const rewire = require('rewire');
const db = require('../../../src/db');
const schedules = require('../../../src/lib/schedules');
const messages = require('../../../src/lib/messages');
const utils = require('../../../src/lib/utils');
const config = require('../../../src/config');
const transitionUtils = require('../../../src/transitions/utils');
const acceptPatientReports = require('../../../src/transitions/accept_patient_reports');
const validation = require('../../../src/lib/validation');

let transition = rewire('../../../src/transitions/registration');

describe('registration', () => {
  afterEach(done => {
    sinon.restore();
    transition = rewire('../../../src/transitions/registration');
    done();
  });

  describe('booleanExpressionFails', () => {
    beforeEach(() => {
      transition.booleanExpressionFails = transition.__get__('booleanExpressionFails');
    });

    it('is false if there is no valid expression', () => {
      transition.booleanExpressionFails({}, '').should.equal(false);
    });

    it('is true if the expresison fails', () => {
      transition.booleanExpressionFails({ foo: 'bar' }, `doc.foo !== 'bar'`).should.equal(true);
    });

    it('is true if the expression is invalid', () => {
      // TODO: should this error instead of just returning false?
      //       If there is a typo we're not going to know about it
      transition.booleanExpressionFails({}, `doc.foo.bar === 'smang'`).should.equal(true);
    });
  });

  describe('addPatient', () => {
    it('trigger creates a new patient', () => {
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
      const getPatientContactUuid = sinon.stub(utils, 'getPatientContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      const view = sinon.stub(db.medic, 'query').resolves({
        rows: [
          {
            doc: {
              _id: submitterId,
              parent: { _id: parentId },
            },
          },
        ],
      });
      const saveDoc = sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_patient' }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);

      return transition.onMatch(change).then(() => {
        getPatientContactUuid.callCount.should.equal(1);
        view.callCount.should.equal(1);
        view.args[0][0].should.equal('medic-client/contacts_by_phone');
        view.args[0][1].key.should.equal(senderPhoneNumber);
        view.args[0][1].include_docs.should.equal(true);
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].name.should.equal(patientName);
        saveDoc.args[0][0].parent._id.should.equal(parentId);
        saveDoc.args[0][0].reported_date.should.equal(53);
        saveDoc.args[0][0].type.should.equal('person');
        saveDoc.args[0][0].patient_id.should.equal(patientId);
        saveDoc.args[0][0].date_of_birth.should.equal(dob);
        saveDoc.args[0][0].source_id.should.equal(reportId);
        saveDoc.args[0][0].created_by.should.equal(submitterId);
      });
    });

    it('does nothing when patient already added', () => {
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
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      const saveDoc = sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_patient_id' }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      return transition.onMatch(change).then(() => {
        saveDoc.callCount.should.equal(0);
      });
    });

    it('uses a given id if configured to', () => {
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
      sinon.stub(utils, 'getPatientContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      const saveDoc = sinon.stub(db.medic, 'post').resolves(1);
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
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(transitionUtils, 'isIdUnique').resolves(true);

      return transition.onMatch(change).then(() => {
        saveDoc.args[0][0].patient_id.should.equal(patientId);
        doc.patient_id.should.equal(patientId);
        (typeof doc.errors).should.equal('undefined');
      });
    });

    it('trigger creates a new contact with the given type', () => {
      const change = {
        doc: {
          _id: 'def',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+555123',
          fields: { patient_name: 'jack' },
          birth_date: '2017-03-31T01:15:09.000Z',
        },
      };
      sinon.stub(utils, 'getPatientContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon.stub(db.medic, 'query').resolves({
        rows: [
          {
            doc: {
              _id: 'abc',
              parent: { _id: 'papa' },
            },
          },
        ],
      });
      const saveDoc = sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: '{ "contact_type": "patient" }'
        }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves('05649');

      return transition.onMatch(change).then(() => {
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].type.should.equal('contact');
        saveDoc.args[0][0].contact_type.should.equal('patient');
      });
    });

    it('errors if the configuration does not point to an id', () => {
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
      sinon.stub(utils, 'getPatientContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      sinon.stub(db.medic, 'post').resolves();
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

      sinon.stub(validation, 'validate').callsArgWith(2, null);

      return transition.onMatch(change).then(() => {
        (typeof doc.patient_id).should.equal('undefined');
        doc.errors.should.deep.equal([
          {
            message: 'messages.generic.no_provided_patient_id',
            code: 'no_provided_patient_id',
          },
        ]);
      });
    });

    it('errors if the given id is not unique', () => {
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
      sinon.stub(utils, 'getPatientContactUuid').resolves(1);
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      sinon.stub(db.medic, 'post').resolves();
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

      sinon.stub(transitionUtils, 'isIdUnique').resolves(false);

      sinon.stub(validation, 'validate').callsArgWith(2, null);

      return transition.onMatch(change).then(() => {
        (typeof doc.patient_id).should.be.equal('undefined');
        doc.errors.should.deep.equal([
          {
            message: 'messages.generic.provided_patient_id_not_unique',
            code: 'provided_patient_id_not_unique',
          },
        ]);
      });
    });

    it('event parameter overwrites the default property for the name of the patient', () => {
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
      sinon.stub(utils, 'getPatientContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: submitterId } } }],
        });
      const saveDoc = sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_patient', params: 'name' }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);

      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);

      return transition.onMatch(change).then(() => {
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].name.should.equal(patientName);
      });
    });

    it('event parameter overwrites the default property for the name of the patient using JSON config', () => {
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
      sinon.stub(utils, 'getPatientContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves(2, null, {
          rows: [{ doc: { parent: { _id: submitterId } } }],
        });
      const saveDoc = sinon.stub(db.medic, 'post').resolves();
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
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);

      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);

      return transition.onMatch(change).then(() => {
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].name.should.equal(patientName);
      });
    });

    it('add_patient and add_patient_id triggers are idempotent', () => {
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
      sinon.stub(utils, 'getPatientContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: submitterId } } }],
        });
      const saveDoc = sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [
          { name: 'on_create', trigger: 'add_patient', params: 'name' },
          { name: 'on_create', trigger: 'add_patient_id', params: 'name' },
        ],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);

      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);

      return transition.onMatch(change).then(() => {
        console.log(JSON.stringify(saveDoc.args, null, 2));
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].name.should.equal(patientName);
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
          'Configuration error in R.add_patient: patient_id_field cannot be set to patient_id'
        );
        done();
      }
    });
  });

  describe('assign_schedule', () => {
    it('event creates the named schedule', () => {
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
        .stub(db.medic, 'query')
        .resolves(2, null, {
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      sinon.stub(db.medic, 'post').resolves(1);
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
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      const getRegistrations = sinon
        .stub(utils, 'getRegistrations')
        .resolves([{ _id: 'xyz' }]);
      sinon.stub(schedules, 'getScheduleConfig').returns('someschedule');
      sinon
        .stub(utils, 'getPatientContactUuid')
        .resolves({ _id: 'uuid' });
      const assignSchedule = sinon
        .stub(schedules, 'assignSchedule')
        .returns(true);
      return transition.onMatch(change).then(() => {
        assignSchedule.callCount.should.equal(1);
        assignSchedule.args[0][1].should.equal('someschedule');
        assignSchedule.args[0][2][0]._id.should.equal('xyz');
        getRegistrations.callCount.should.equal(1);
      });
    });
  });

  describe('filter', () => {
    it('returns false for reports with no registration configured', () => {
      const doc = { form: 'R', type: 'data_record' };
      const configGet = sinon.stub(config, 'get').returns([{ form: 'XYZ' }]);
      const actual = transition.filter(doc);
      configGet.callCount.should.equal(1);
      configGet.args[0][0].should.equal('registrations');
      actual.should.equal(false);
    });

    it('returns false for reports that are not valid submissions', () => {
      const doc = { form: 'R', type: 'data_record' };
      sinon.stub(utils, 'isValidSubmission').returns(false);
      sinon.stub(config, 'get').returns([{ form: 'R' }]);
      const actual = transition.filter(doc);
      config.get.callCount.should.equal(1);
      config.get.args[0][0].should.equal('registrations');
      utils.isValidSubmission.callCount.should.equal(1);
      utils.isValidSubmission.args[0].should.deep.equal([doc]);
      actual.should.equal(false);
    });

    it('returns true for reports that are valid submissions', () => {
      const doc = { form: 'R', type: 'data_record' };
      sinon.stub(utils, 'isValidSubmission').returns(true);
      sinon.stub(config, 'get').returns([{ form: 'R' }]);
      const actual = transition.filter(doc);
      config.get.callCount.should.equal(1);
      config.get.args[0][0].should.equal('registrations');
      utils.isValidSubmission.callCount.should.equal(1);
      utils.isValidSubmission.args[0].should.deep.equal([doc]);
      actual.should.equal(true);
    });
  });

  describe('trigger param configuration', () => {
    beforeEach(() => {
      transition.fireConfiguredTriggers = transition.__get__('fireConfiguredTriggers');
      transition.triggers = transition.__get__('triggers');
    });

    it('supports strings', () => {
      const eventConfig = {
        form: 'R',
        events: [
          { name: 'on_create', trigger: 'testparamparsing', params: 'foo' },
        ],
      };

      transition.triggers.testparamparsing = sinon.stub();

      return transition.fireConfiguredTriggers(eventConfig, {}).then(() => {
        transition.triggers.testparamparsing.callCount.should.equal(1);
        transition.triggers.testparamparsing.args[0][0].params.should.deep.equal(['foo']);
      });
    });

    it('supports comma-delimited strings as array', () => {
      const eventConfig = {
        form: 'R',
        events: [
          { name: 'on_create', trigger: 'testparamparsing', params: 'foo,bar' },
        ],
      };

      transition.triggers.testparamparsing = sinon.stub();

      return transition.fireConfiguredTriggers(eventConfig, {}).then(() => {
        transition.triggers.testparamparsing.callCount.should.equal(1);
        transition.triggers.testparamparsing.args[0][0].params.should.deep.equal(['foo', 'bar']);
      });
    });

    it('supports arrays as a string', () => {
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

      transition.triggers.testparamparsing = sinon.stub();

      return transition.fireConfiguredTriggers(eventConfig, {}).then(() => {
        transition.triggers.testparamparsing.callCount.should.equal(1);
        transition.triggers.testparamparsing.args[0][0].params.should.deep.equal(['foo', 'bar', 3]);
      });
    });

    it('supports JSON as a string', () => {
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

      transition.triggers.testparamparsing = sinon.stub();

      return transition.fireConfiguredTriggers(eventConfig, {}).then(() => {
        transition.triggers.testparamparsing.callCount.should.equal(1);
        transition.triggers.testparamparsing.args[0][0].params.should.deep.equal({ foo: 'bar' });
      });
    });

    it('supports direct JSON', () => {
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

      transition.triggers.testparamparsing = sinon.stub();

      return transition.fireConfiguredTriggers(eventConfig, {}).then(() => {
        transition.triggers.testparamparsing.callCount.should.equal(1);
        transition.triggers.testparamparsing.args[0][0].params.should.deep.equal({ foo: 'bar' });
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

    it('fails if the configured contact type is not known', done => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: '{ "contact_type": "unknown" }'
        }],
      }];
      const contactTypes = [{ id: 'known' }];

      sinon.stub(config, 'get')
        .withArgs('registrations').returns(eventConfig)
        .withArgs('contact_types').returns(contactTypes);
      try {
        transition.init();
        done(new Error('Expected validation error'));
      } catch (e) {
        (e instanceof Error).should.equal(true);
        e.message.should.equal('Configuration error in R.add_patient: trigger would create a doc with an unknown contact type "unknown"');
        done();
      }
    });

    it('fails if the configured contact type is not a person', done => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: '{ "contact_type": "place" }'
        }],
      }];
      const contactTypes = [{ id: 'place' }];

      sinon.stub(config, 'get')
        .withArgs('registrations').returns(eventConfig)
        .withArgs('contact_types').returns(contactTypes);
      try {
        transition.init();
        done(new Error('Expected validation error'));
      } catch (e) {
        (e instanceof Error).should.equal(true);
        e.message.should.equal('Configuration error in R.add_patient: trigger would create a doc with a place contact type "place"');
        done();
      }
    });

    it('fails if the default "person" contact type is not known', done => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: ''
        }],
      }];
      const contactTypes = [{ id: 'place' }];

      sinon.stub(config, 'get')
        .withArgs('registrations').returns(eventConfig)
        .withArgs('contact_types').returns(contactTypes);
      try {
        transition.init();
        done(new Error('Expected validation error'));
      } catch (e) {
        (e instanceof Error).should.equal(true);
        e.message.should.equal('Configuration error in R.add_patient: trigger would create a doc with an unknown contact type "person"');
        done();
      }
    });

    it('succeeds for known person type', done => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: '{ "contact_type": "patient" }'
        }],
      }];
      const contactTypes = [{ id: 'patient', person: true }];

      sinon.stub(config, 'get')
        .withArgs('registrations').returns(eventConfig)
        .withArgs('contact_types').returns(contactTypes);
      transition.init();
      done();
    });
  });

  describe('addMessages', () => {
    beforeEach(() => {
      transition.addMessages = transition.__get__('addMessages');
    });

    it('prepops and passes the right information to messages.addMessage', () => {
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
        .resolves(testRegistration);

      const testConfig = { messages: [testMessage1, testMessage2] };
      const testDoc = {
        fields: {
          patient_id: '12345',
        },
        patient: testPatient,
      };

      return transition.addMessages(testConfig, testDoc).then(() => {
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
      });
    });

    it('supports ignoring messages based on bool_expr', () => {
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
        .resolves(testRegistration);

      const testConfig = { messages: [testMessage1, testMessage2] };
      const testDoc = {
        fields: {
          patient_id: '12345',
        },
        patient: testPatient,
      };

      return transition.addMessages(testConfig, testDoc).then( () => {
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
      });
    });
  });

  describe('clear_schedule', () => {
    beforeEach(() => {
      transition.triggers = transition.__get__('triggers');
    });

    it('should work when doc has no patient', () => {
      sinon.stub(utils, 'getReportsBySubject').resolves([]);
      return transition.triggers.clear_schedule({ doc: {}, params: [] });
    });

    it('should query utils.getReportsBySubject with correct params', () => {
      sinon.stub(utils, 'getReportsBySubject').resolves([]);
      sinon.stub(utils, 'getSubjectIds').returns(['uuid', 'patient_id']);
      const doc = { patient: { _id: 'uuid', patient_id: 'patient_id' } };
      sinon.stub(acceptPatientReports, 'silenceRegistrations').callsArgWith(3, null);

      return transition.triggers.clear_schedule({ doc, params: [] }).then(() => {
        utils.getSubjectIds.callCount.should.equal(1);
        utils.getSubjectIds.args[0].should.deep.equal([doc.patient]);
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getReportsBySubject.args[0].should.deep.equal([ {
          ids: ['uuid', 'patient_id'],
          registrations: true
        } ]);
      });
    });

    it('should call silenceRegistrations with correct params', () => {
      const doc = { _id: 'uuid', patient_id: 'patient_id' },
            params = ['1', '2', '3', '4'],
            registrations = ['a', 'b', 'c'];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      sinon.stub(utils, 'getSubjectIds').returns(['uuid', 'patient_id']);
      sinon.stub(acceptPatientReports, 'silenceRegistrations').callsArgWith(3, null);

      return transition.triggers.clear_schedule({ doc, params }).then(() => {
        acceptPatientReports.silenceRegistrations.callCount.should.equal(1);
        acceptPatientReports.silenceRegistrations.args[0][0].should.deep.equal({
          silence_type: '1,2,3,4',
          silence_for: null
        });
        acceptPatientReports.silenceRegistrations.args[0][1].should.deep.equal(doc);
        acceptPatientReports.silenceRegistrations.args[0][2].should.deep.equal(registrations);
      });
    });

    it('should catch getReportsBySubject errors', () => {
      sinon.stub(utils, 'getReportsBySubject').rejects({ some: 'error' });
      sinon.stub(utils, 'getSubjectIds').returns([]);
      sinon.stub(acceptPatientReports, 'silenceRegistrations');

      return transition.triggers
        .clear_schedule({ doc: {}, params: [] })
        .then(r => r.should.deep.equal('Should have thrown'))
        .catch((err) => {
          err.should.deep.equal({ some: 'error' });
          utils.getReportsBySubject.callCount.should.equal(1);
          utils.getSubjectIds.callCount.should.equal(1);
          acceptPatientReports.silenceRegistrations.callCount.should.equal(0);
      });
    });

    it('should catch silenceRegistrations errors', () => {
      sinon.stub(utils, 'getReportsBySubject').resolves([]);
      sinon.stub(utils, 'getSubjectIds').returns([]);
      sinon.stub(acceptPatientReports, 'silenceRegistrations').callsArgWith(3, { some: 'err' });
      return transition.triggers
        .clear_schedule({ doc: {}, params: [] })
        .then(r => r.should.deep.equal('Should have thrown'))
        .catch(err => {
          err.should.deep.equal({ some: 'err' });
          utils.getReportsBySubject.callCount.should.equal(1);
          utils.getSubjectIds.callCount.should.equal(1);
          acceptPatientReports.silenceRegistrations.callCount.should.equal(1);
        });
    });
  });
});
