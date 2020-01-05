const chai = require('chai');
const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid');

describe('generate_shortcode_on_contacts', () => {
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb([], true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { generate_shortcode_on_contacts: false }
    };

    const doc = {
      _id: uuid(),
      type: 'person',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc._id))
      .then(person => {
        chai.expect(person.patient_id).to.equal(undefined);
        chai.expect(person.place_id).to.equal(undefined);
      });
  });

  it('should be skipped when not a configured contact', () => {
    const settings = {
      transitions: { generate_shortcode_on_contacts: true }
    };

    const contact = {
      _id: uuid(),
      type: 'contact',
      contact_type: 'something',
      reported_date: new Date().getTime(),
    };

    const report = {
      _id: uuid(),
      type: 'data_record',
      fields: { some: 'thing' },
      reported_date: new Date().getTime(),
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs([contact, report]))
      .then(() => sentinelUtils.waitForSentinel([contact._id, report._id]))
      .then(() => sentinelUtils.getInfoDocs([contact._id, report._id]))
      .then(([ contactInfo, reportInfo ]) => {
        expect(Object.keys(contactInfo.transitions).length).toEqual(0);
        expect(Object.keys(reportInfo.transitions).length).toEqual(0);
      })
      .then(() => utils.getDocs([contact._id, report._id]))
      .then(([contact, report]) => {
        chai.expect(contact.patient_id).to.equal(undefined);
        chai.expect(contact.place_id).to.equal(undefined);

        chai.expect(report.patient_id).to.equal(undefined);
        chai.expect(report.place_id).to.equal(undefined);
      });
  });

  it('should add place_id', () => {
    const settings = {
      transitions: { generate_shortcode_on_contacts: true },
    };

    const doc = {
      _id: uuid(),
      type: 'clinic',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info).to.deep.nested.include({ 'transitions.generate_shortcode_on_contacts.ok' : true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(place => {
        chai.expect(place.patient_id).to.equal(undefined);
        chai.expect(place.place_id).not.to.equal(undefined);
      });
  });

  it('should be skipped when patient_id is filled', () => {
    const settings = {
      transitions: { generate_shortcode_on_contacts: true },
    };

    const doc = {
      _id: uuid(),
      type: 'person',
      patient_id: '1234',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc._id))
      .then(person => {
        expect(person.patient_id).toEqual('1234');
      });
  });

  it('should be skipped when place_id is filled', () => {
    const settings = {
      transitions: { generate_shortcode_on_contacts: true },
    };

    const doc = {
      _id: uuid(),
      type: 'clinic',
      place_id: '1234',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc._id))
      .then(person => {
        expect(person.place_id).toEqual('1234');
      });
  });

  it('should add patient_id', () => {
    const settings = {
      transitions: { generate_shortcode_on_contacts: true },
    };

    const doc = {
      _id: uuid(),
      type: 'person',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.generate_shortcode_on_contacts).toBeDefined();
        expect(info.transitions.generate_shortcode_on_contacts.ok).toEqual(true);
      })
      .then(() => utils.getDoc(doc._id))
      .then(person => {
        expect(person.patient_id).toBeDefined();
      });
  });

  it('should add place_id', () => {
    const settings = {
      transitions: { generate_shortcode_on_contacts: true },
    };

    const doc = {
      _id: uuid(),
      type: 'health_center',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info).to.deep.nested.include({ 'transitions.generate_shortcode_on_contacts.ok': true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(place => {
        chai.expect(place.place_id).to.be.ok;
      });
  });
});
