const utils = require('../../../utils'),
      sentinelUtils = require('../utils'),
      uuid = require('uuid');

describe('update_clinics', () => {
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb([], true).then(done));

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
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(contact))
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.contact).not.toBeDefined();
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
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(contact))
      .then(() => utils.saveDoc(doc1))
      .then(() => sentinelUtils.waitForSentinel(doc1._id))
      .then(() => sentinelUtils.getInfoDoc(doc1._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc1._id))
      .then(updated => {
        expect(updated.contact).not.toBeDefined();
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc2._id))
      .then(updated => {
        expect(updated.contact).toEqual({ _id: 'some_other_contact' });
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
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([doc1, doc2]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id]))
      .then(infos => {
        expect(Object.keys(infos[0].transitions).length).toEqual(0);
        expect(Object.keys(infos[1].transitions).length).toEqual(0);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id]))
      .then(updated => {
        expect(updated[0].contact).not.toBeDefined();
        expect(updated[1].contact).not.toBeDefined();
      });
  });

  it('should add facility_not_found', () => {
    const settings = {
      transitions: { update_clinics: true },
      forms: { 'A': { public_form: false } }
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
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([doc1, doc2, doc3]))
      .then(() => sentinelUtils.waitForSentinel([doc1._id, doc2._id, doc3._id]))
      .then(() => sentinelUtils.getInfoDocs([doc1._id, doc2._id, doc3._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.update_clinics.ok).toEqual(true);
        expect(infos[1].transitions).toBeDefined();
        expect(infos[1].transitions.update_clinics.ok).toEqual(true);

        expect(Object.keys(infos[2].transitions).length).toEqual(0);
      })
      .then(() => utils.getDocs([doc1._id, doc2._id, doc3._id]))
      .then(updated => {
        expect(updated[0].contact).not.toBeDefined();
        expect(updated[0].errors.length).toEqual(1);
        expect(updated[0].errors[0].code).toEqual('sys.facility_not_found');

        expect(updated[1].contact).not.toBeDefined();
        expect(updated[1].errors.length).toEqual(1);
        expect(updated[1].errors[0].code).toEqual('sys.facility_not_found');

        expect(updated[2].contact).not.toBeDefined();
        expect(updated[2].errors).not.toBeDefined();
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

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs(contacts))
      .then(() => utils.saveDocs([ refidClinic, refidPerson, phonePerson ]))
      .then(() => sentinelUtils.waitForSentinel([refidClinic._id, refidPerson._id, phonePerson._id]))
      .then(() => sentinelUtils.getInfoDocs([refidClinic._id, refidPerson._id, phonePerson._id]))
      .then(infos => {
        expect(infos[0].transitions).toBeDefined();
        expect(infos[0].transitions.update_clinics).toBeDefined();
        expect(infos[0].transitions.update_clinics.ok).toEqual(true);
      })
      .then(() => utils.getDocs([refidClinic._id, refidPerson._id, phonePerson._id]))
      .then(updated => {
        expect(updated[0].contact).toEqual({ _id: 'person' });
        expect(updated[1].contact).toEqual({ _id: 'person' });
        expect(updated[2].contact).toEqual({ _id: 'person2' });
      });
  });
});
