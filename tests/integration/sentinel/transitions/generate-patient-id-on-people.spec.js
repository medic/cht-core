const chai = require('chai');
const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const uuid = require('uuid').v4;
const { expect } = require('chai');

describe('generate_patient_id_on_people', () => {
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb([], true));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { generate_patient_id_on_people: false }
    };

    const doc = {
      _id: uuid(),
      type: 'person',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      })
      .then(() => utils.getDoc(doc._id))
      .then(person => {
        chai.expect(person.patient_id).to.equal(undefined);
        chai.expect(person.place_id).to.equal(undefined);
      });
  });

  it('should add place_id', () => {
    const settings = {
      transitions: { generate_patient_id_on_people: true },
    };

    const doc = {
      _id: uuid(),
      type: 'clinic',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info).to.deep.nested.include({ 'transitions.generate_patient_id_on_people.ok' : true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(place => {
        chai.expect(place.patient_id).to.equal(undefined);
        chai.expect(place.place_id).not.to.equal(undefined);
      });
  });

  it('should be skipped when patient_id is filled', () => {
    const settings = {
      transitions: { generate_patient_id_on_people: true },
    };

    const doc = {
      _id: uuid(),
      type: 'person',
      patient_id: '1234',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      })
      .then(() => utils.getDoc(doc._id))
      .then(person => {
        expect(person.patient_id).to.equal('1234');
      });
  });

  it('should add patient_id', () => {
    const settings = {
      transitions: { generate_patient_id_on_people: true },
    };

    const doc = {
      _id: uuid(),
      type: 'person',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions.generate_patient_id_on_people.ok).to.be.true;
      })
      .then(() => utils.getDoc(doc._id))
      .then(person => {
        expect(person.patient_id).to.be.a('string');
      });
  });

  it('should add place_id', () => {
    const settings = {
      transitions: { generate_patient_id_on_people: true },
    };

    const doc = {
      _id: uuid(),
      type: 'health_center',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        chai.expect(info).to.deep.nested.include({ 'transitions.generate_patient_id_on_people.ok': true });
      })
      .then(() => utils.getDoc(doc._id))
      .then(place => {
        chai.expect(place.place_id).to.be.ok;
      });
  });
});
