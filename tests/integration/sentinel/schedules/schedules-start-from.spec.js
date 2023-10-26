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
          params: ['sch1', 'sch2', 'sch3', 'sch4', 'sch5'],
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
          },
          {
            name: 'sch4',
            start_from: ['date1', 'fields.lmp_date1', 'date2'],
            messages: [{
              group: 1,
              offset: '10 days',
              recipient: 'clinic',
              message: [{
                locale: 'en',
                content: 'This schedule will not be created since none of the start_from fields exist'
              }],
            }]
          },
          {
            name: 'sch5',
            start_from: ['reported_date', 'fields.lmp_date', 'lmp_date'],
            messages: [{
              group: 1,
              offset: '9 days',
              recipient: 'clinic',
              message: [{
                locale: 'en',
                content: 'from multiple date fields'
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

    const expectedMessage1_2 = (state) => createExpectedMessage('sch1', 2, state, 'schedule from field in array');
    const expectedMessage2_1 = (state) => createExpectedMessage('sch2', 1, state, 'schedule from reported_date');
    const expectedMessage2_2 = (state) => createExpectedMessage('sch2', 1, state, 'schedule from reported_date');
    const expectedMessage3_1 = (state) => createExpectedMessage('sch3', 1, state, 'schedule from first existing field');
    const expectedMessage3_2 = (state) => createExpectedMessage('sch3', 1, state, 'another schedule from array');
    // schedule of type sch4 won't be created because none of the fields in start_from array exists
    const expectedMessage5_1 = (state) => createExpectedMessage('sch5', 1, state, 'from multiple date fields');


    const expectedDue1_2 = expectedDueDate(startDate, '12', 'weeks');
    const expectedDue2_1 = expectedDueDate(moment(), '2', 'weeks');
    const expectedDue2_2 = expectedDueDate(moment(), '180', 'days');
    const expectedDue3_1 = expectedDueDate(startDate, '10', 'days');
    const expectedDue3_2 = expectedDueDate(startDate, '100', 'days');
    const expectedDue5_1 = expectedDueDate(moment(), '9', 'days');

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
        chai.expect(updWithPatient.scheduled_tasks).to.have.lengthOf(6);

        const [sch1_2, sch2_1, sch2_2, sch3_1, sch3_2, sch5_1] = updWithPatient.scheduled_tasks;

        chai.expect(sch1_2).to.deep.nested.include(expectedMessage1_2('scheduled'));
        chai.expect(sch2_1).to.deep.nested.include(expectedMessage2_1('scheduled'));
        chai.expect(sch2_2).to.deep.nested.include(expectedMessage2_2('scheduled'));
        chai.expect(sch3_1).to.deep.nested.include(expectedMessage3_1('scheduled'));
        chai.expect(sch3_2).to.deep.nested.include(expectedMessage3_2('scheduled'));
        chai.expect(sch5_1).to.deep.nested.include(expectedMessage5_1('scheduled'));

        // ensuring schedules started with expected field
        chai.expect(moment(sch1_2.due).format('YYYY-MM-DD')).to.equal(expectedDue1_2, 'schedule 2 of sch1');
        chai.expect(moment(sch2_1.due).format('YYYY-MM-DD')).to.equal(expectedDue2_1, 'schedule 1 of sch2');
        chai.expect(moment(sch2_2.due).format('YYYY-MM-DD')).to.equal(expectedDue2_2, 'schedule 2 of sch2');
        chai.expect(moment(sch3_1.due).format('YYYY-MM-DD')).to.equal(expectedDue3_1, 'schedule 1 of sch3');
        chai.expect(moment(sch3_2.due).format('YYYY-MM-DD')).to.equal(expectedDue3_2, 'schedule 2 of sch3');
        // schedules from sch4; Not expected this to be created
        chai.expect(moment(sch5_1.due).format('YYYY-MM-DD')).to.equal(expectedDue5_1, 'schedule 1 of sch5');
        
        chai.expect(updWithClinic.scheduled_tasks).to.be.ok;
        chai.expect(updWithClinic.scheduled_tasks).to.have.lengthOf(4);

        const [csch1_2, csch2_1, csch2_2, csch5_1 ] = updWithClinic.scheduled_tasks;

        // schedule 3 and 4 will not be created for clinic because fields don't exist.

        chai.expect(csch1_2).to.deep.nested.include(expectedMessage1_2('scheduled'));
        chai.expect(csch2_1).to.deep.nested.include(expectedMessage2_1('scheduled'));
        chai.expect(csch2_2).to.deep.nested.include(expectedMessage2_2('scheduled'));
        chai.expect(csch5_1).to.deep.nested.include(expectedMessage5_1('scheduled'));

        chai.expect(moment(csch1_2.due).format('YYYY-MM-DD')).to.equal(expectedDue1_2);
        chai.expect(moment(csch2_1.due).format('YYYY-MM-DD')).to.equal(expectedDue2_1);
        chai.expect(moment(csch2_2.due).format('YYYY-MM-DD')).to.equal(expectedDue2_2);
        chai.expect(moment(csch5_1.due).format('YYYY-MM-DD')).to.equal(expectedDue5_1);
      });
  });
});
