const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const moment = require('moment');
const chai = require('chai');
const sinon = require('sinon');
const phoneNumber = require('@medic/phone-number');
const uuid = require('uuid').v4;

const { expect } = chai;

const PATIENT_PHONE='+111';
const CLINIC_PHONE='+222';
const HEALTHCENTER_PHONE='+333';
const SENDER_PHONE='+999';
const VALID_PHONE='+18005550123';

// Contacts used in the resolution chain
const contacts = [
  {
    _id: 'patient',
    type: 'contact',
    name: 'Alice',
    phone: PATIENT_PHONE,
  },
  {
    _id: 'clinic',
    type: 'clinic',
    name: 'Bob',
    contact: {
      phone: CLINIC_PHONE
    }
  },
  {
    _id: 'contact_no_phone',
    type: 'contact'
  },
  {
    _id: 'parent',
    type: 'health_center',
    name: 'health center',
    contact: {
      phone: HEALTHCENTER_PHONE        
    }
  }
];

const getIds = docs => docs.map(d => d._id);

describe('Recipient Resolution Integration', () => {

  before(() => {
    utils.saveDocs(contacts);
    sinon.stub(phoneNumber, 'validate').returns(true);
  });
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb(getIds(contacts), true));

  it('correctly resolves recipients', async () => {
    const settings = {
      transitions: { registration: true },
      sms: {
        default_to_sender: false
      },
      registrations: [{
        form: 'FORM',
        events: [{
          name: 'on_create',
          trigger: 'assign_schedule',
          params: ['recipient_test'],
          bool_expr: ''
        }],
        messages: [],
      }],
      forms: { FORM: {} },
      schedules: [
        {
          name: 'recipient_test',
          start_from: 'reported_date',
          messages: [
            {
              group: 1,
              offset: '1 days',
              recipient: 'reporting_unit',
              message: [{ locale: 'en', content: 'msg to reporting_unit' }],
            },
            {
              group: 2,
              offset: '2 days',
              recipient: ['contact_no_phone', 'reporting_unit'],
              message: [{ locale: 'en', content: 'msg to fallback to reporting_unit' }],
            },
            {
              group: 3,
              offset: '3 days',
              recipient: ['unknown_field', ` ${VALID_PHONE} `],
              message: [{ locale: 'en', content: 'msg to trimmed valid number' }],
            },
            {
              group: 4,
              offset: '4 days',
              recipient: '',
              message: [{ locale: 'en', content: 'fall back to sender when empty' }],
            },
            {
              group: 5,
              offset: '5 days',
              recipient: ['phone', 'health_center'],
              message: [{ locale: 'en', content: 'fall back to contact type specified' }],
            },
            {
              group: 6,
              offset: '6 days',
              recipient: ['field1', 'field2', 'field3'],
              message: [{ locale: 'en', content: 'recipient as text when none exist' }],
            },
          ]
        }
      ]
    };

    const report = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: SENDER_PHONE,
      reported_date: moment().valueOf(),
      contact: {
        _id: 'patient',
        parent: {
          _id: 'clinic',
          parent: {
            _id: 'parent',
          }
        }
      }
    };

    await utils.updateSettings(settings, { ignoreReload: 'sentinel' });
    await utils.saveDocs([report]);
    await sentinelUtils.waitForSentinel([report._id]);
    const [updated] = await utils.getDocs([report._id]);
    expect(updated.scheduled_tasks.length).to.equal(6);
    const [msg1, msg2, msg3, msg4, msg5, msg6] = updated.scheduled_tasks;
    expect(msg1['messages'][0].to).to.equal(SENDER_PHONE);
    expect(msg2['messages'][0].to).to.equal(SENDER_PHONE);
    expect(msg3['messages'][0].to).to.equal(VALID_PHONE);
    expect(msg4['messages'][0].to).to.equal(SENDER_PHONE);
    expect(msg5['messages'][0].to).to.equal(HEALTHCENTER_PHONE);
    expect(msg6['messages'][0].to).to.equal('field1');
  });
});
