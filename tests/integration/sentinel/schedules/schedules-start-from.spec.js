const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v4;
const moment = require('moment');
const chai = require('chai');

const contacts = [
  {
    _id: 'district_hospital',
    name: 'District hospital',
    type: 'contact',
    contact_type: 'district_hospital',
    place_id: 'the_district_hospital',
    reported_date: new Date().getTime()
  },
  {
    _id: 'health_center',
    name: 'Health Center',
    type: 'contact',
    contact_type: 'health_center',
    place_id: 'the_health_center',
    parent: { _id: 'district_hospital' },
    reported_date: new Date().getTime()
  },
  {
    _id: 'clinic',
    name: 'Clinic',
    type: 'contact',
    contact_type: 'clinic',
    place_id: 'the_clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: {
      _id: 'person', parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
    },
    reported_date: new Date().getTime()
  },
  {
    _id: 'person',
    name: 'Person',
    type: 'contact',
    contact_type: 'person',
    patient_id: 'patient',
    parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: '+444999',
    reported_date: new Date().getTime()
  },
  {
    _id: 'supervisor',
    name: 'Supervisor',
    type: 'contact',
    contact_type: 'person',
    patient_id: 'the_supervisor',
    parent: { _id: 'district_hospital' },
    phone: '+00000000',
    reported_date: new Date().getTime()
  },
  {
    _id: 'middle_man',
    name: 'Middle man',
    type: 'contact',
    contact_type: 'person',
    patient_id: 'the_middle_man',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    phone: '+11111111',
    reported_date: new Date().getTime()
  }
];

const getIds = docs => docs.map(doc => doc._id);

const createExpectedMessage = (type, group, state, message) => ({
  type,
  group,
  state,
  'messages[0].message': message,
});


describe('schedules alternative start_from', () => {
  before(() => utils.saveDocs(contacts));
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb(getIds(contacts), true));

  it('schedules are created with start_from as string or as an array', () => {
    const startDate = moment().subtract(1, 'week');
    const settings = {
      transitions: { registration: true },
      registrations: [{
        form: 'FORM',
        events: [{
          name: 'on_create',
          trigger: 'assign_schedule',
          params: ['sch1', 'sch2', 'sch3'],
          bool_expr: ''
        }],
        messages: [],
      }],
      forms: { FORM: {} },
      schedules:
        [
          {
            name: 'sch1',
            start_from: ['some_date_field'],
            messages: [{
              // past schedule
              group: 1,
              offset: '5 days',
              send_time: '09:00',
              recipient: 'clinic',
              message: [{
                locale: 'en',
                content: 'this wont show up'
              }],
            }, {
              group: 2,
              offset: '12 weeks',
              send_day: '',
              send_time: '',
              recipient: 'clinic',
              message: [{
                locale: 'en',
                content: 'schedule from field in array'
              }],
            }]
          },
          {
            name: 'sch2',
            start_from: 'reported_date',
            messages: [{
              group: 1,
              offset: '2 weeks',
              send_time: '09:00',
              recipient: 'clinic',
              message: [{
                locale: 'en',
                content: 'schedule from reported_date'
              }],
            },
            {
              group: 1,
              offset: '180 days',
              send_day: '',
              send_time: '',
              recipient: 'clinic',
              message: [{
                locale: 'en',
                content: 'schedule from reported_date'
              }],
            }]
          },
          {
            name: 'sch3',
            start_from: ['random_date', 'fields.lmp_date'],
            messages: [{
              group: 1,
              offset: '10 days',
              recipient: 'clinic',
              message: [{
                locale: 'en',
                content: 'schedule from first existing field'
              }],
            },
            {
              group: 1,
              offset: '100 days',
              send_day: '',
              send_time: '',
              recipient: 'clinic',
              message: [{
                locale: 'en',
                content: 'another schedule from array'
              }],
            }]
          }
        ]
    };

    const patient = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+97798261',
      fields: {
        patient_uuid: 'person',
        patient_id: 'patient',
        lmp_date: startDate
      },
      some_date_field: startDate,
      reported_date: moment().valueOf(),
      contact: {
        _id: 'person',
        parent: { _id: 'clinic', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } }
      }
    };

    const clinic = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+11111111',
      fields: {
        place_id: 'the_clinic',
      },
      some_date_field: startDate,
      reported_date: moment().valueOf(),
      contact: {
        _id: 'middle_man',
        parent: { _id: 'health_center', parent: { _id: 'district_hospital' } }
      },
    };

    const expectedMessage2 = (state) => createExpectedMessage('sch1', 2, state, 'schedule from field in array');

    const expectedMessage3 = (state) => createExpectedMessage('sch2', 1, state, 'schedule from reported_date');

    const expectedMessage4 = (state) => createExpectedMessage('sch2', 1, state, 'schedule from reported_date');

    const expectedMessage5 = (state) => createExpectedMessage('sch3', 1, state, 'schedule from first existing field');

    const expectedMessage6 = (state) => createExpectedMessage('sch3', 1, state, 'another schedule from array');

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([patient, clinic]))
      .then(() => sentinelUtils.waitForSentinel([patient._id, clinic._id]))
      .then(() => sentinelUtils.getInfoDocs([patient._id, clinic._id]))
      .then(([infoWithPatient, infoWithClinic]) => {
        chai.expect(infoWithPatient).to.deep.nested.include({ 'transitions.registration.ok': true });
        chai.expect(infoWithClinic).to.deep.nested.include({ 'transitions.registration.ok': true });
      })
      .then(() => utils.getDocs([patient._id, clinic._id]))
      .then(([updWithPatient, updWithClinic]) => {
        chai.expect(updWithPatient.scheduled_tasks).to.be.ok;
        chai.expect(updWithPatient.scheduled_tasks).to.have.lengthOf(5);

        chai.expect(updWithPatient.scheduled_tasks[0]).to.deep.nested.include(expectedMessage2('scheduled'));
        chai.expect(updWithPatient.scheduled_tasks[1]).to.deep.nested.include(expectedMessage3('scheduled'));
        chai.expect(updWithPatient.scheduled_tasks[2]).to.deep.nested.include(expectedMessage4('scheduled'));
        chai.expect(updWithPatient.scheduled_tasks[3]).to.deep.nested.include(expectedMessage5('scheduled'));
        chai.expect(updWithPatient.scheduled_tasks[4]).to.deep.nested.include(expectedMessage6('scheduled'));

        // ensuring schedule started with our field and not reported_date
        chai.expect(startDate.diff(updWithPatient.scheduled_tasks[3].due, 'days')).to.equal(-10);

        chai.expect(updWithClinic.scheduled_tasks).to.be.ok;
        chai.expect(updWithClinic.scheduled_tasks).to.have.lengthOf(3);

        chai.expect(updWithClinic.scheduled_tasks[0]).to.deep.nested.include(expectedMessage2('scheduled'));
        chai.expect(updWithClinic.scheduled_tasks[1]).to.deep.nested.include(expectedMessage3('scheduled'));
        chai.expect(updWithClinic.scheduled_tasks[2]).to.deep.nested.include(expectedMessage4('scheduled'));
      });
  });
});
