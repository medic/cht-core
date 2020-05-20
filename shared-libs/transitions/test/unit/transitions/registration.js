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
let settings;

describe('registration', () => {
  beforeEach(() => {
    settings = {
      contact_types: [
        { id: 'place' },
        { id: 'person', person: true, parents: ['place'] },
      ]
    };
  });
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
      const getContactUuid = sinon.stub(utils, 'getContactUuid').resolves();
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
      sinon.stub(db.medic, 'get').withArgs('papa').resolves({ _id: parentId, type: 'contact', contact_type: 'place' });
      const saveDoc = sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_patient' }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);
      sinon.stub(config, 'getAll').returns(settings);

      return transition.onMatch(change).then(() => {
        getContactUuid.callCount.should.equal(1);
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
      sinon.stub(config, 'getAll').returns(settings);
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
      sinon.stub(utils, 'getContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      sinon.stub(db.medic, 'get').withArgs('papa').resolves({ _id: 'papa', type: 'place' });
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
      sinon.stub(config, 'getAll').returns(settings);

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
      sinon.stub(utils, 'getContactUuid').resolves();
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
      sinon.stub(db.medic, 'get').withArgs('papa').resolves({ _id: 'papa', type: 'place' });
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
      sinon.stub(config, 'getAll').returns({
        contact_types: [
          { id: 'place' },
          { id: 'patient', person: true, parents: ['place'] },
        ]
      });

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
      sinon.stub(utils, 'getContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      sinon.stub(db.medic, 'get').withArgs('papa').resolves({ _id: 'papa', type: 'place' });
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
      sinon.stub(config, 'getAll').returns(settings);

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
      sinon.stub(utils, 'getContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: 'papa' } } }],
        });
      sinon.stub(db.medic, 'get').withArgs('papa').resolves({ _id: 'papa', type: 'place' });
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
      sinon.stub(config, 'getAll').returns(settings);

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
      sinon.stub(utils, 'getContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: submitterId } } }],
        });
      sinon.stub(db.medic, 'get').withArgs('papa').resolves({ _id: 'papa', type: 'place' });
      const saveDoc = sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_patient', params: 'name' }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);

      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);
      sinon.stub(config, 'getAll').returns(settings);

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
      sinon.stub(utils, 'getContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: submitterId } } }],
        });
      sinon.stub(db.medic, 'get').withArgs('papa').resolves({ _id: 'papa', type: 'place' });
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
      sinon.stub(config, 'getAll').returns(settings);

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
      sinon.stub(utils, 'getContactUuid').resolves();
      // return expected view results when searching for contacts_by_phone
      sinon
        .stub(db.medic, 'query')
        .resolves({
          rows: [{ doc: { parent: { _id: submitterId } } }],
        });
      sinon.stub(db.medic, 'get').withArgs('papa').resolves({ _id: 'papa', type: 'place' });
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
      sinon.stub(config, 'getAll').returns(settings);


      return transition.onMatch(change).then(() => {
        saveDoc.callCount.should.equal(1);
        saveDoc.args[0][0].name.should.equal(patientName);
      });
    });

    it('fails when patient_id_field is set to patient_id', () => {
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
      transition.init.should.throw(
        Error,
        'Configuration error in R.add_patient: patient_id_field cannot be set to patient_id'
      );
    });

    it('should add configured type of person', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { patient_name: 'Bob' },
          contact: {
            _id: 'pete',
            name: 'Pete',
            contact_type: 'chw',
            type: 'contact',
            parent: {
              _id: 'petes',
              name: 'Petes Place',
              contact_type: 'clinic',
              type: 'contact',
              parent: { _id: 'west_hc', name: 'west hc', contact_type: 'health_center', type: 'contact' }
            }
          },
        }
      };
      const patientId = 'my_patient_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_patient', params: { contact_type: 'patient' } }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.patient',
          message: [
            {
              locale: 'en',
              content: 'Patient {{patient_name}} with type {{patient.contact_type}} was added to ' +
                '{{patient.parent.name}}({{patient.parent.contact_type}})'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'health_center' },
        { id: 'clinic', parents: ['health_center'] },
        { id: 'patient', parents: ['clinic'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([patientId]);
        db.medic.post.callCount.should.equal(1);
        db.medic.post.args[0].should.deep.equal([{
          name: 'Bob',
          patient_id: patientId,
          source_id: change.doc._id,
          type: 'contact',
          contact_type: 'patient',
          parent: { _id: 'petes', parent: { _id: 'west_hc' } },
          created_by: 'pete',
          reported_date: change.doc.reported_date,
        }]);
        (!!change.doc.errors).should.equal(false);
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Patient Bob with type patient was added to Petes Place(clinic)'
        });
      });
    });

    it('should add person with selected parent', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { buddy_name: 'Marcel', parent: 'georges_place' },
          contact: {
            _id: 'pete',
            name: 'Pete',
            contact_type: 'chw',
            type: 'contact',
            parent: {
              _id: 'petes',
              name: 'Petes Place',
              place_id: 'petes_place',
              type: 'contact',
              contact_type: 'area_type_1',
              parent: {
                _id: 'west_hc', name: 'west hc', contact_type: 'health_center',
                type: 'contact', place_id: 'the_west_hc'
              }
            },
          },
        }
      };
      const parent = {
        _id: 'georges',
        name: 'Georges Place',
        type: 'contact',
        place_id: 'georges_place',
        contact_type: 'area_type_2',
        parent: { _id: 'west_hc' },
      };
      const patientId = 'my_patient_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact').resolves(parent);
      sinon.stub(db.medic, 'post').resolves();

      const eventConfig = {
        form: 'R',
        events: [{
          name: 'on_create', trigger: 'add_patient',
          params: { contact_type: 'buddy', patient_name_field: 'buddy_name', parent_id: 'parent' }
        }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.patient',
          message: [
            {
              locale: 'en',
              content: 'Friend {{buddy_name}} with type {{patient.contact_type}} was added to ' +
                '{{patient.parent.name}}({{patient.parent.contact_type}})'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'health_center' },
        { id: 'area_type_1', parents: ['health_center'] },
        { id: 'area_type_2', parents: ['health_center'] },
        { id: 'patient', parents: ['area_type_1'], person: true },
        { id: 'buddy', parents: ['area_type_2'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([patientId]);
        utils.getContact.callCount.should.equal(1);
        utils.getContact.args[0].should.deep.equal([change.doc.fields.parent]);
        db.medic.post.callCount.should.equal(1);
        db.medic.post.args[0].should.deep.equal([{
          name: 'Marcel',
          patient_id: patientId,
          source_id: change.doc._id,
          type: 'contact',
          contact_type: 'buddy',
          parent: { _id: 'georges', parent: { _id: 'west_hc' } },
          created_by: 'pete',
          reported_date: change.doc.reported_date,
        }]);
        (!!change.doc.errors).should.equal(false);
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Friend Marcel with type buddy was added to Georges Place(area_type_2)'
        });
      });
    });

    it('should not create person when parent is required but not specified', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { patient_name: 'Patricia', parent_id: 'not_the_correct_parent_field' },
          contact: {
            _id: 'pete',
            name: 'Pete',
            contact_type: 'chw',
            type: 'contact',
            parent: {
              _id: 'petes',
              name: 'Petes Place',
              place_id: 'petes_place',
              type: 'contact',
              contact_type: 'area_type_1',
              parent: {
                _id: 'west_hc', name: 'west hc', contact_type: 'health_center',
                type: 'contact', place_id: 'the_west_hc'
              }
            },
          },
        }
      };

      const patientId = 'my_patient_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact');
      sinon.stub(db.medic, 'post').resolves();

      const eventConfig = {
        form: 'R',
        events: [{
          name: 'on_create', trigger: 'add_patient', params: { contact_type: 'patient', parent_id: 'parent' }
        }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'parent_field_not_provided',
          message: [
            {
              locale: 'en',
              content: 'Cannot create patient without parent'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'health_center' },
        { id: 'area_type_1', parents: ['health_center'] },
        { id: 'area_type_2', parents: ['health_center'] },
        { id: 'patient', parents: ['area_type_1'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);

      return transition.onMatch(change).then(result => {
        result.should.equal(true);
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([patientId]);
        utils.getContact.callCount.should.equal(0);
        db.medic.post.callCount.should.equal(0);
        change.doc.errors.length.should.equal(1);
        change.doc.errors[0].should.deep.equal({
          message: 'Cannot create patient without parent',
          code: 'parent_field_not_provided',
        });
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Cannot create patient without parent'
        });
      });
    });

    it('should not create person when parent is required and missing', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { patient_name: 'Patricia', parent_id: 'non-existent-contact' },
          contact: {
            _id: 'pete',
            name: 'Pete',
            contact_type: 'chw',
            type: 'contact',
            parent: {
              _id: 'petes',
              name: 'Petes Place',
              place_id: 'petes_place',
              type: 'contact',
              contact_type: 'area_type_1',
              parent: {
                _id: 'west_hc', name: 'west hc', contact_type: 'health_center',
                type: 'contact', place_id: 'the_west_hc'
              }
            },
          },
        }
      };

      const patientId = 'my_patient_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact').resolves();
      sinon.stub(db.medic, 'post').resolves();

      const eventConfig = {
        form: 'R',
        events: [{
          name: 'on_create', trigger: 'add_patient', params: { contact_type: 'patient', parent_id: 'parent_id' }
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'parent_not_found',
          message: [
            {
              locale: 'en',
              content: 'Selected parent {{fields.parent_id}} does not exists.'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'health_center' },
        { id: 'area_type_1', parents: ['health_center'] },
        { id: 'area_type_2', parents: ['health_center'] },
        { id: 'patient', parents: ['area_type_1'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);

      return transition.onMatch(change).then(result => {
        result.should.equal(true);
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([patientId]);
        utils.getContact.callCount.should.equal(1);
        utils.getContact.args[0].should.deep.equal([change.doc.fields.parent_id]);
        db.medic.post.callCount.should.equal(0);
        change.doc.errors.length.should.equal(1);
        change.doc.errors[0].should.deep.equal({
          message: 'Selected parent non-existent-contact does not exists.',
          code: 'parent_not_found',
        });
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Selected parent non-existent-contact does not exists.'
        });
      });
    });

    it('should not create person when parent is invalid', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { buddy_name: 'Marcel', the_parent_field: 'georges_place' },
          contact: {
            _id: 'pete',
            name: 'Pete',
            contact_type: 'chw',
            type: 'contact',
            parent: {
              _id: 'petes',
              name: 'Petes Place',
              place_id: 'petes_place',
              type: 'contact',
              contact_type: 'area_type_1',
              parent: {
                _id: 'west_hc', name: 'west hc', contact_type: 'health_center',
                type: 'contact', place_id: 'the_west_hc'
              }
            },
          },
        }
      };
      const parent = {
        _id: 'georges',
        name: 'Georges Place',
        type: 'contact',
        place_id: 'georges_place',
        contact_type: 'area_type_1',
        parent: { _id: 'west_hc' },
      };
      const patientId = 'my_patient_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact').resolves(parent);
      sinon.stub(db.medic, 'post').resolves();

      const eventConfig = {
        form: 'R',
        events: [{
          name: 'on_create', trigger: 'add_patient', params: { contact_type: 'patient', parent_id: 'the_parent_field' }
        }],
        messages: [{
          recipient: 'reporting_unit',
          event_type: 'parent_invalid',
          message: [
            {
              locale: 'en',
              content: 'Cannot create patient under parent {{parent.name}}({{parent.place_id}}) ' +
                'of type {{parent.contact_type}}.'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'health_center' },
        { id: 'area_type_1', parents: ['health_center'] },
        { id: 'area_type_2', parents: ['health_center'] },
        { id: 'patient', parents: ['area_type_2'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(patientId);

      return transition.onMatch(change).then(result => {
        result.should.equal(true);
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([patientId]);
        utils.getContact.callCount.should.equal(1);
        utils.getContact.args[0].should.deep.equal([change.doc.fields.the_parent_field]);
        db.medic.post.callCount.should.equal(0);
        change.doc.errors.length.should.equal(1);
        change.doc.errors[0].should.deep.equal({
          message: 'Cannot create patient under parent Georges Place(georges_place) of type area_type_1.',
          code: 'parent_invalid',
        });
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Cannot create patient under parent Georges Place(georges_place) of type area_type_1.'
        });
      });
    });
  });

  describe('addPlace', () => {
    it('should add place with correct hardcoded type under correct parent', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { place_name: 'new clinic', parent_id: 'north_hc_place' },
          contact: {
            _id: 'pete',
            name: 'Pete',
            contact_type: 'chw',
            type: 'contact',
            parent: {
              _id: 'petes',
              name: 'Petes Place',
              contact_type: 'clinic',
              type: 'contact',
              parent: {
                _id: 'west_hc',
                name: 'west hc',
                contact_type: 'health_center',
                type: 'contact',
                place_id: 'south_hc_place',
              }
            }
          },
        }
      };
      const placeId = 'my_place_id';
      const parent = {
        _id: 'north_hc',
        name: 'north hc',
        type: 'contact',
        contact_type: 'health_center',
        place_id: 'north_hc_place',
      };
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact').resolves(parent);
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{
          name: 'on_create', trigger: 'add_place', params: { contact_type: 'clinic', parent_id: 'parent_id' }
        }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.place',
          message: [
            {
              locale: 'en',
              content: 'Place {{place_name}} with type {{place.type}} was added to ' +
                '{{place.parent.name}}({{place.parent.contact_type}})'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'health_center' },
        { id: 'clinic', parents: ['health_center'] },
        { id: 'patient', parents: ['clinic'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(placeId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([placeId]);
        utils.getContact.callCount.should.equal(1);
        utils.getContact.args[0].should.deep.equal([change.doc.fields.parent_id]);
        db.medic.post.callCount.should.equal(1);
        db.medic.post.args[0].should.deep.equal([{
          name: 'new clinic',
          place_id: placeId,
          source_id: change.doc._id,
          type: 'clinic',
          parent: { _id: 'north_hc' },
          created_by: 'pete',
          reported_date: change.doc.reported_date,
        }]);
        (!!change.doc.errors).should.equal(false);
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Place new clinic with type clinic was added to north hc(health_center)'
        });
      });
    });

    it('should add place with right configurable type and submitter parent when parent_id param not specified', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { place_name: 'new clinic' },
          contact: {
            _id: 'supervisor',
            name: 'Frank',
            contact_type: 'supervisor',
            type: 'contact',
            parent: {
              _id: 'west_hc',
              name: 'west hc',
              place_id: 'west_hc_place',
              contact_type: 'health_center_1',
              type: 'contact',
            }
          },
        }
      };
      const placeId = 'my_place_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact');
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_place', params: { contact_type: 'clinic_1' }}],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.place',
          message: [
            {
              locale: 'en',
              content: 'Place {{place_name}} with type {{place.contact_type}} was added to ' +
                '{{place.parent.name}}({{place.parent.contact_type}})'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'health_center_1' },
        { id: 'clinic_1', parents: ['health_center_1'] },
        { id: 'supervisor', parents: ['health_center_1'], person: true },
        { id: 'patient', parents: ['clinic_1'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(placeId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([placeId]);
        utils.getContact.callCount.should.equal(0);
        db.medic.post.callCount.should.equal(1);
        db.medic.post.args[0].should.deep.equal([{
          name: 'new clinic',
          place_id: placeId,
          source_id: change.doc._id,
          type: 'contact',
          contact_type: 'clinic_1',
          parent: { _id: 'west_hc' },
          created_by: 'supervisor',
          reported_date: change.doc.reported_date,
        }]);
        (!!change.doc.errors).should.equal(false);
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Place new clinic with type clinic_1 was added to west hc(health_center_1)'
        });
      });
    });

    it('should default to submitter by phone parent when parent_id param not specified', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { place_name: 'new clinic' },
        }
      };
      const placeId = 'my_place_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact');
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_place', params: { contact_type: 'clinic_1' }}],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.place',
          message: [
            {
              locale: 'en',
              content: 'Place {{place_name}} with type {{place.contact_type}} was added to ' +
                '{{place.parent.name}}({{place.parent.contact_type}})'
            }
          ]
        }]
      };
      sinon.stub(db.medic, 'query')
        .withArgs('medic-client/contacts_by_phone')
        .resolves({ rows: [
          {
            doc: {
              _id: 'supervisor',
              name: 'Frank',
              contact_type: 'supervisor',
              type: 'contact',
              phone: '+111222',
              parent: { _id: 'west_hc' }
            }
          }
        ]});
      sinon.stub(db.medic, 'get').withArgs('west_hc').resolves({
        _id: 'west_hc',
        name: 'west hc',
        place_id: 'west_hc_place',
        contact_type: 'health_center_1',
        type: 'contact',
      });
      const contactTypes = [
        { id: 'health_center_1' },
        { id: 'clinic_1', parents: ['health_center_1'] },
        { id: 'supervisor', parents: ['health_center_1'], person: true },
        { id: 'patient', parents: ['clinic_1'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(placeId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([placeId]);
        utils.getContact.callCount.should.equal(0);
        db.medic.query.callCount.should.equal(1);
        db.medic.query.args[0]
          .should.deep.equal(['medic-client/contacts_by_phone', { key: '+111222', include_docs: true }]);
        db.medic.get.callCount.should.equal(1);
        db.medic.get.args[0].should.deep.equal(['west_hc']);
        db.medic.post.callCount.should.equal(1);
        db.medic.post.args[0].should.deep.equal([{
          name: 'new clinic',
          place_id: placeId,
          source_id: change.doc._id,
          type: 'contact',
          contact_type: 'clinic_1',
          parent: { _id: 'west_hc' },
          created_by: 'supervisor',
          reported_date: change.doc.reported_date,
        }]);
        (!!change.doc.errors).should.equal(false);
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Place new clinic with type clinic_1 was added to west hc(health_center_1)'
        });
      });
    });

    it('should use the name property indicated within the event parameter ', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { doodle: 'newest place', parent_id: 'north_hc_place', place_name: 'this is a trick' },
          contact: {
            _id: 'pete',
            name: 'Pete',
            contact_type: 'chw',
            type: 'contact',
            parent: {
              _id: 'petes',
              name: 'Petes Place',
              contact_type: 'clinic',
              type: 'contact',
              parent: {
                _id: 'west_hc',
                name: 'west hc',
                contact_type: 'health_center',
                type: 'contact',
                place_id: 'south_hc_place',
              }
            }
          },
        }
      };
      const placeId = 'my_place_id';
      const parent = {
        _id: 'north_hc',
        name: 'north hc',
        type: 'contact',
        contact_type: 'health_center',
        place_id: 'north_hc_place',
      };
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact').resolves(parent);
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{
          name: 'on_create', trigger: 'add_place',
          params: { contact_type: 'clinic_1', parent_id: 'parent_id', place_name_field: 'doodle' }
        }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.place',
          message: [
            {
              locale: 'en',
              content: 'Place {{place.name}} with type {{place.contact_type}} was added to ' +
                '{{place.parent.name}}({{place.parent.contact_type}})'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'health_center' },
        { id: 'clinic_1', parents: ['health_center'] },
        { id: 'patient', parents: ['clinic_1'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(placeId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([placeId]);
        utils.getContact.callCount.should.equal(1);
        utils.getContact.args[0].should.deep.equal([change.doc.fields.parent_id]);
        db.medic.post.callCount.should.equal(1);
        db.medic.post.args[0].should.deep.equal([{
          name: 'newest place',
          place_id: placeId,
          source_id: change.doc._id,
          type: 'contact',
          contact_type: 'clinic_1',
          parent: { _id: 'north_hc' },
          created_by: 'pete',
          reported_date: change.doc.reported_date,
        }]);
        (!!change.doc.errors).should.equal(false);
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Place newest place with type clinic_1 was added to north hc(health_center)'
        });
      });
    });

    it('should use the parent property indicated within the event parameter ', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { doodle: 'newest place', fiddle: 'north_hc_place', place_name: 'this is a trick' },
          contact: {
            _id: 'pete',
            name: 'Pete',
            contact_type: 'chw',
            type: 'contact',
            parent: {
              _id: 'petes',
              name: 'Petes Place',
              contact_type: 'clinic',
              type: 'contact',
              parent: {
                _id: 'west_hc',
                name: 'west hc',
                contact_type: 'health_center',
                type: 'contact',
                place_id: 'south_hc_place',
              }
            }
          },
        }
      };
      const placeId = 'my_place_id';
      const parent = {
        _id: 'north_hc',
        name: 'north hc',
        type: 'contact',
        contact_type: 'health_center',
        place_id: 'north_hc_place',
      };
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact').resolves(parent);
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{
          name: 'on_create', trigger: 'add_place',
          params: { contact_type: 'clinic', parent_id: 'fiddle', place_name_field: 'doodle' }
        }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'report_accepted',
          bool_expr: 'doc.place',
          message: [
            {
              locale: 'en',
              content: 'Place {{place.name}} with type {{place.type}} was added to ' +
                '{{place.parent.name}}({{place.parent.contact_type}})'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'health_center' },
        { id: 'clinic', parents: ['health_center'] },
        { id: 'patient', parents: ['clinic'], person: true },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(placeId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([placeId]);
        utils.getContact.callCount.should.equal(1);
        utils.getContact.args[0].should.deep.equal([change.doc.fields.fiddle]);
        db.medic.post.callCount.should.equal(1);
        db.medic.post.args[0].should.deep.equal([{
          name: 'newest place',
          place_id: placeId,
          source_id: change.doc._id,
          type: 'clinic',
          parent: { _id: 'north_hc' },
          created_by: 'pete',
          reported_date: change.doc.reported_date,
        }]);
        (!!change.doc.errors).should.equal(false);
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Place newest place with type clinic was added to north hc(health_center)'
        });
      });
    });

    it('should not create place when parent_id is not defined and no contact', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { place_name: 'New Orleans' },
        }
      };
      const placeId = 'my_place_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact');
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_place', params: { contact_type: 'clinic' } }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'parent_not_found',
          message: [
            {
              locale: 'en',
              content: 'Cannot create clinic with name {{place_name}}: parent not found.'
            }
          ]
        }]
      };
      sinon.stub(config, 'get').withArgs('registrations').returns([eventConfig]);
      sinon.stub(db.medic, 'query').withArgs('medic-client/contacts_by_phone').resolves({ rows: [] });
      sinon.stub(db.medic, 'get');

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(placeId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([placeId]);
        utils.getContact.callCount.should.equal(0);
        db.medic.post.callCount.should.equal(0);
        db.medic.query.callCount.should.equal(1);
        db.medic.query.args[0]
          .should.deep.equal(['medic-client/contacts_by_phone', { key: '+111222', include_docs: true }]);
        db.medic.get.callCount.should.equal(0);

        change.doc.errors.length.should.equal(1);
        change.doc.errors[0].should.deep.equal({
          code: 'parent_not_found',
          message: 'Cannot create clinic with name New Orleans: parent not found.',
        });
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Cannot create clinic with name New Orleans: parent not found.'
        });
      });
    });

    it('should not create place when parent is not defined', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { place_name: 'New Orleans' },
        }
      };
      const placeId = 'my_place_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact');
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_place', params: { contact_type: 'clinic', parent_id: 'some_id' } }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'parent_field_not_provided',
          message: [
            {
              locale: 'en',
              content: 'Cannot create clinic with name {{place_name}}: parent field not provided.'
            }
          ]
        }]
      };
      sinon.stub(config, 'get').withArgs('registrations').returns([eventConfig]);

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(placeId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([placeId]);
        utils.getContact.callCount.should.equal(0);
        db.medic.post.callCount.should.equal(0);

        change.doc.errors.length.should.equal(1);
        change.doc.errors[0].should.deep.equal({
          code: 'parent_field_not_provided',
          message: 'Cannot create clinic with name New Orleans: parent field not provided.',
        });
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Cannot create clinic with name New Orleans: parent field not provided.'
        });
      });
    });

    it('should not create place when parent is not found', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { place_name: 'New Orleans' },
        }
      };
      const placeId = 'my_place_id';
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact');
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_place', params: { contact_type: 'clinic', parent_id: 'some_id' } }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'parent_field_not_provided',
          message: [
            {
              locale: 'en',
              content: 'Cannot create clinic with name {{place_name}}: parent field not provided.'
            }
          ]
        }]
      };
      sinon.stub(config, 'get').withArgs('registrations').returns([eventConfig]);

      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(placeId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([placeId]);
        utils.getContact.callCount.should.equal(0);
        db.medic.post.callCount.should.equal(0);

        change.doc.errors.length.should.equal(1);
        change.doc.errors[0].should.deep.equal({
          code: 'parent_field_not_provided',
          message: 'Cannot create clinic with name New Orleans: parent field not provided.',
        });
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Cannot create clinic with name New Orleans: parent field not provided.'
        });
      });
    });

    it('should not create place when parent is not valid', () => {
      const change = {
        doc: {
          _id: 'reportID',
          type: 'data_record',
          form: 'R',
          reported_date: 53,
          from: '+111222',
          fields: { place_name: 'New Orleans', parent_id: 'hc2' },
          contact: {
            _id: 'bob', name: 'Bob',
            parent: {
              _id: 'a_health_center', name: 'HC1', type: 'contact', contact_type: 'health_center', place_id: 'hc1'
            }
          }
        }
      };
      const placeId = 'my_place_id';
      const parent = {
        _id: 'other_health_center',
        name: 'Other health center',
        place_id: 'hc2',
        type: 'contact',
        contact_type: 'health_center',
        parent: { _id: 'district1' },
      };
      sinon.stub(utils, 'getContactUuid').resolves();
      sinon.stub(utils, 'getContact').resolves(parent);
      sinon.stub(db.medic, 'post').resolves();
      const eventConfig = {
        form: 'R',
        events: [{ name: 'on_create', trigger: 'add_place', params: { contact_type: 'area', parent_id: 'parent_id' } }],
        messages: [ {
          recipient: 'reporting_unit',
          event_type: 'parent_invalid',
          message: [
            {
              locale: 'en',
              content: 'Cannot create area with name {{place_name}} under parent {{parent.name}} of type ' +
                '{{parent.contact_type}}'
            }
          ]
        }]
      };
      const contactTypes = [
        { id: 'district' },
        { id: 'health_center', parents: ['district'] },
        { id: 'local_thing', parents: ['district'] },
        { id: 'clinic', parents: ['health_center'] },
        { id: 'area', parents: ['local_thing'] },
      ];
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(utils, 'getRegistrations').resolves([]);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(placeId);

      return transition.onMatch(change).then(() => {
        transitionUtils.getUniqueId.callCount.should.equal(1);
        utils.getContactUuid.callCount.should.equal(1);
        utils.getContactUuid.args[0].should.deep.equal([placeId]);
        utils.getContact.callCount.should.equal(1);
        utils.getContact.args[0].should.deep.equal(['hc2']);
        db.medic.post.callCount.should.equal(0);

        change.doc.errors.length.should.equal(1);
        change.doc.errors[0].should.deep.equal({
          code: 'parent_invalid',
          message: 'Cannot create area with name New Orleans under parent Other health center of type health_center',
        });
        change.doc.tasks.length.should.equal(1);
        change.doc.tasks[0].messages[0].should.include({
          to: change.doc.from,
          message: 'Cannot create area with name New Orleans under parent Other health center of type health_center'
        });
      });
    });
  });

  describe('addCase', () => {
    it('trigger assigns a case id', () => {
      const caseId = '99955';
      const change = {
        doc: {
          _id: 'def',
          type: 'data_record',
          form: 'S',
          reported_date: 53,
          from: '+555123',
          fields: { level: 8 }
        },
      };
      const eventConfig = {
        form: 'S',
        events: [{ name: 'on_create', trigger: 'add_case' }],
      };
      sinon.stub(config, 'get').returns([eventConfig]);
      sinon.stub(validation, 'validate').callsArgWith(2, null);
      sinon.stub(transitionUtils, 'getUniqueId').resolves(caseId);
      sinon.stub(config, 'getAll').returns(settings);

      return transition.onMatch(change).then(() => {
        change.doc.case_id.should.equal(caseId);
      });
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
      sinon.stub(utils, 'getContactUuid').resolves('uuid');
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

    it('fails with no parameters', () => {
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
      transition.init.should.throw(Error, 'Configuration error. Expecting params to be defined as the name of the ' +
        'schedule(s) for R.assign_schedule');
    });

    it('fails with object parameters', () => {
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
      transition.init.should.throw(Error, 'Configuration error. Expecting params to be a string, ' +
        'comma separated list, or an array for R.assign_schedule: \'{ "name": "hello" }\'');
    });

    it('succeeds with array parameters', () => {
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
    });

    it('parse failure for invalid JSON propagates to the callbacks', () => {
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
      transition.init.should.throw(Error, 'Configuration error. Unable to parse params for R.testparamparsing: ' +
        '\'{"foo": "bar"\'. Error: SyntaxError: Unexpected end of JSON input');
    });

    it('add_patient fails if the configured contact type is not known', () => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: '{ "contact_type": "unknown" }'
        }],
      }];
      const contactTypes = [{ id: 'known' }];

      sinon.stub(config, 'get').returns(eventConfig);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      transition.init.should.throw(Error, 'Configuration error in R.add_patient: trigger would create a doc with an ' +
        'unknown contact type "unknown"');
    });

    it('add_patient fails if the configured contact type is not a person', () => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: '{ "contact_type": "place" }'
        }],
      }];
      const contactTypes = [{ id: 'place' }];

      sinon.stub(config, 'get').returns(eventConfig);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      transition.init.should.throw(Error, 'Configuration error in R.add_patient: trigger would create a person ' +
        'with a place contact type "place"');
    });

    it('add_patient fails if the default "person" contact type is not known', () => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_patient',
          params: ''
        }],
      }];
      const contactTypes = [{ id: 'place' }];

      sinon.stub(config, 'get').returns(eventConfig);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      transition.init.should.throw(Error, 'Configuration error in R.add_patient: trigger would create a doc ' +
        'with an unknown contact type "person"');
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

      sinon.stub(config, 'get').returns(eventConfig);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      transition.init();
      done();
    });

    it('add_place should fail for no defined contact_type', () => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: ''
        }],
      }];
      const contactTypes = [{ id: 'place' }];

      sinon.stub(config, 'get').returns(eventConfig);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      transition.init.should.throw(Error, 'Configuration error in R.add_place: trigger would create a place ' +
        'with an undefined contact type');
    });

    it('add_place should fail for unknown contact_type', () => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: { contact_type: 'oh_noo' }
        }],
      }];
      const contactTypes = [{ id: 'place' }];

      sinon.stub(config, 'get').returns(eventConfig);
      sinon.stub(config, 'getAll').returns({ contact_types: contactTypes });

      transition.init.should.throw(Error, 'Configuration error in R.add_place: trigger would create a place ' +
        'with an unknown contact type "oh_noo"');
    });

    it('add_place should fail for person contact_type', () => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: { contact_type: 'person' }
        }],
      }];

      sinon.stub(config, 'get').returns(eventConfig);
      sinon.stub(config, 'getAll').returns(settings);

      transition.init.should.throw(Error, 'Configuration error in R.add_place: trigger would create a place with ' +
        'a person contact type "person"');
    });

    it('should succeed for known place type', () => {
      const eventConfig = [{
        form: 'R',
        events: [{
          name: 'on_create',
          trigger: 'add_place',
          params: { contact_type: 'place' }
        }],
      }];

      sinon.stub(config, 'get').returns(eventConfig);
      sinon.stub(config, 'getAll').returns(settings);

      transition.init();
    });
  });

  describe('addMessages', () => {
    beforeEach(() => {
      transition.addMessages = transition.__get__('addMessages');
    });

    it('prepops and passes the right information to messages.addMessage', () => {
      const testPhone = '1234';
      const testMessage1 = {
        message: 'A Test Message 1',
        recipient: testPhone,
        event_type: 'report_accepted',
      };
      const testMessage2 = {
        message: 'A Test Message 2',
        recipient: testPhone,
        event_type: 'report_accepted',
      };
      const testRegistration = 'some registrations';
      const testPatient = 'a patient contact';

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
          place: undefined,
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
      const testPhone = '1234';
      const testMessage1 = {
        message: 'A Test Message 1',
        recipient: testPhone,
        event_type: 'report_accepted',
      };
      const testMessage2 = {
        message: 'A Test Message 2',
        recipient: testPhone,
        event_type: 'report_accepted',
        bool_expr: '1 === 2',
      };
      const testRegistration = 'some registrations';
      const testPatient = 'a patient contact';

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
          place: undefined,
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
      const doc = { _id: 'uuid', patient_id: 'patient_id' };
      const params = ['1', '2', '3', '4'];
      const registrations = ['a', 'b', 'c'];
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
