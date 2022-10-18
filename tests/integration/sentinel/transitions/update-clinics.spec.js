const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const uuid = require('uuid').v4;
const { expect } = require('chai');

describe('update_clinics', () => {
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb([], true));

  it('should be skipped when transition is disabled', () => {
    const settings = {transitions: {update_clinics: false}};

    const contact = {
      _id: 'contact',
      type: 'person',
      phone: '12345',
      reported_date: new Date().getTime(),
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '12345',
      reported_date: new Date().getTime(),
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(contact))
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.contact).to.be.undefined;
      });
  });

  it('should be skipped when not matching or has contact', () => {
    const settings = { transitions: { update_clinics: true } };

    const contact = {
      _id: 'contact',
      type: 'person',
      phone: '12345',
      reported_date: new Date().getTime(),
    };

    const doc1 = {
      _id: uuid(),
      from: '12345',
      reported_date: new Date().getTime(),
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      contact: { _id: 'some_other_contact' },
      from: '12345',
      reported_date: new Date().getTime(),
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(contact))
      .then(() => utils.saveDoc(doc1))
      .then(() => sentinelUtils.waitForSentinel(doc1._id))
      .then(() => sentinelUtils.getInfoDoc(doc1._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      })
      .then(() => utils.getDoc(doc1._id))
      .then(updated => {
        expect(updated.contact).to.be.undefined;
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      })
      .then(() => utils.getDoc(doc2._id))
      .then(updated => {
        expect(updated.contact).to.deep.equal({ _id: 'some_other_contact' });
      });
  });

  it('should skip when contact not found', () => {
    const settings = {
      transitions: { update_clinics: true },
      forms: { 'A': { public_form: true } }
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      from: '12345',
      form: 'A',
      reported_date: new Date().getTime()
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      refid: 'external',
      form: 'A',
      reported_date: new Date().getTime(),
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([doc1, doc2]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(Object.keys(infos[0].transitions)).to.be.empty;
        expect(Object.keys(infos[1].transitions)).to.be.empty;
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].contact).to.be.undefined;
        expect(updated[1].contact).to.be.undefined;
      });
  });

  it('should add facility_not_found', () => {
    const settings = {
      transitions: { update_clinics: true },
      forms: { 'A': { public_form: false } },
      update_clinics: [ {
        form: 'A',
        messages: [
          {
            event_type: 'sys.facility_not_found',
            recipient: 'reporting_unit',
            translation_key: 'sys.facility_not_found',
          }
        ],
      }]
    };

    const doc1 = {
      _id: uuid(),
      type: 'data_record',
      from: '12345',
      form: 'A',
      reported_date: new Date().getTime()
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      refid: 'external',
      form: 'B',
      reported_date: new Date().getTime(),
    };

    const doc3 = {
      _id: uuid(),
      type: 'data_record',
      from: '12345',
      form: 'A',
      content_type: 'xml',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs([doc1, doc2, doc3]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id, doc3._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id, doc3._id]))
      .then(infos => {
        expect(infos[0].transitions).to.not.be.undefined;
        expect(infos[0].transitions.update_clinics.ok).to.be.true;
        expect(infos[1].transitions).to.not.be.undefined;
        expect(infos[1].transitions.update_clinics.ok).to.be.true;

        expect(Object.keys(infos[2].transitions)).to.be.empty;
      })
      .then(() => utils.getDocs([doc1._id, doc2._id, doc3._id]))
      .then(updated => {
        expect(updated[0].contact).to.be.undefined;
        expect(updated[0].errors).to.have.lengthOf(1);
        expect(updated[0].tasks).to.have.lengthOf(1);
        expect(updated[0].tasks[0].messages[0].to).to.equal('12345');
        expect(updated[0].tasks[0].messages[0].message).to.equal('Facility not found.');
        expect(updated[0].errors[0].code).to.equal('sys.facility_not_found');

        expect(updated[1].contact).to.be.undefined;
        expect(updated[1].errors).to.have.lengthOf(1);
        expect(updated[1].errors[0].code).to.equal('sys.facility_not_found');
        expect(updated[1].tasks).to.be.undefined;

        expect(updated[2].contact).to.be.undefined;
        expect(updated[2].errors).to.be.undefined;
      });

  });

  it('should add contact', () => {
    const settings = {transitions: {update_clinics: true}};
    const contacts = [
      {
        _id: 'person',
        type: 'person',
        rc_code: 'sms_person',
        reported_date: new Date().getTime(),
      },
      {
        _id: 'person_with_contact_type',
        type: 'person',
        contact_type: 'some value', // check that `type` is prioritized
        rc_code: 'sms_person_ct',
        reported_date: new Date().getTime(),
      },
      {
        _id: 'clinic',
        type: 'clinic',
        rc_code: 'sms_clinic',
        contact: { _id: 'person' },
        reported_date: new Date().getTime(),
      },
      {
        _id: 'person2',
        type: 'person',
        phone: '21112222',
        reported_date: new Date().getTime(),
      }
    ];

    const refidPerson = {
      _id: uuid(),
      type: 'data_record',
      refid: 'SMS_PERSON', // view indexes with uppercase only
      reported_date: new Date().getTime()
    };

    const refidPersonContactType = {
      _id: uuid(),
      type: 'data_record',
      refid: 'SMS_PERSON_CT', // view indexes with uppercase only
      reported_date: new Date().getTime()
    };

    const refidClinic = {
      _id: uuid(),
      type: 'data_record',
      refid: 'SMS_CLINIC', // view indexes with uppercase only
      reported_date: new Date().getTime()
    };

    const phonePerson = {
      _id: uuid(),
      type: 'data_record',
      from: '21112222',
      reported_date: new Date().getTime()
    };

    const docs = [ refidClinic, refidPerson, phonePerson, refidPersonContactType ];
    const docIds = docs.map(doc => doc._id);

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(contacts))
      .then(() => utils.saveDocs(docs))
      .then(() => sentinelUtils.waitForSentinel(docIds))
      .then(() => sentinelUtils.getInfoDocs(docIds))
      .then(infos => {
        expect(infos[0].transitions).to.not.be.undefined;
        expect(infos[0].transitions.update_clinics).to.not.be.undefined;
        expect(infos[0].transitions.update_clinics.ok).to.be.true;
      })
      .then(() => utils.getDocs(docIds))
      .then(updated => {
        expect(updated[0].contact).to.deep.equal({ _id: 'person' });
        expect(updated[1].contact).to.deep.equal({ _id: 'person' });
        expect(updated[2].contact).to.deep.equal({ _id: 'person2' });
        expect(updated[3].contact).to.deep.equal({ _id: 'person_with_contact_type' });
      });
  });
});
