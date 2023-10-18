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

const expectedDueDate = (start, offset, period) => start.clone().add(offset, period).format('YYYY-MM-DD');

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

    const expectedMessage1 = (state) => createExpectedMessage('sch1', 2, state, 'schedule from field in array');
    const expectedMessage2 = (state) => createExpectedMessage('sch2', 1, state, 'schedule from reported_date');
    const expectedMessage3 = (state) => createExpectedMessage('sch2', 1, state, 'schedule from reported_date');
    const expectedMessage4 = (state) => createExpectedMessage('sch3', 1, state, 'schedule from first existing field');
    const expectedMessage5 = (state) => createExpectedMessage('sch3', 1, state, 'another schedule from array');

    const expectedDue1 = expectedDueDate(startDate, '12', 'weeks');
    const expectedDue2 = expectedDueDate(startDate, '2', 'weeks');
    const expectedDue3 = expectedDueDate(startDate, '180', 'days');
    const expectedDue4 = expectedDueDate(startDate, '10', 'days');
    const expectedDue5 = expectedDueDate(startDate, '100', 'days');

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

        const [schedule1, schedule2, schedule3, schedule4, schedule5] = updWithPatient.scheduled_tasks;

        chai.expect(schedule1).to.deep.nested.include(expectedMessage1('scheduled'));
        chai.expect(schedule2).to.deep.nested.include(expectedMessage2('scheduled'));
        chai.expect(schedule3).to.deep.nested.include(expectedMessage3('scheduled'));
        chai.expect(schedule4).to.deep.nested.include(expectedMessage4('scheduled'));
        chai.expect(schedule5).to.deep.nested.include(expectedMessage5('scheduled'));

        // ensuring schedules started with expected field
        chai.expect(moment(schedule1.due).format('YYYY-MM-DD')).to.equal(expectedDue1);
        chai.expect(moment(schedule2.due).format('YYYY-MM-DD')).to.equal(expectedDue2);
        chai.expect(moment(schedule3.due).format('YYYY-MM-DD')).to.equal(expectedDue3);
        chai.expect(moment(schedule4.due).format('YYYY-MM-DD')).to.equal(expectedDue4);
        chai.expect(moment(schedule5.due).format('YYYY-MM-DD')).to.equal(expectedDue5);

        chai.expect(updWithClinic.scheduled_tasks).to.be.ok;
        chai.expect(updWithClinic.scheduled_tasks).to.have.lengthOf(3);

        chai.expect(updWithClinic.scheduled_tasks[0]).to.deep.nested.include(expectedMessage1('scheduled'));
        chai.expect(updWithClinic.scheduled_tasks[1]).to.deep.nested.include(expectedMessage2('scheduled'));
        chai.expect(updWithClinic.scheduled_tasks[2]).to.deep.nested.include(expectedMessage3('scheduled'));
      });
  });
});
