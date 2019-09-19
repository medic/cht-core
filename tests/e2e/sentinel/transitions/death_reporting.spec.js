const utils = require('../../../utils'),
      sentinelUtils = require('../utils'),
      uuid = require('uuid');

const contacts = [{
  _id: 'person',
  type: 'person',
  name: 'Person',
  patient_id: '12345',
  reported_date: new Date().getTime(),
  phone: 'phone'
}, {
  _id: 'person2',
  type: 'person',
  name: 'Person',
  patient_id: '98765',
  reported_date: new Date().getTime(),
  phone: 'phone2'
}];

describe('death_reporting', () => {
  beforeEach(done => utils.saveDocs(contacts).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb([], true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { death_reporting: false },
      death_reporting: {
        mark_deceased_forms: ['DEAD'],
        undo_deceased_forms: ['UNDEAD'],
        date_field: 'date'
      },
      forms: { DEAD: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'DEAD',
      type: 'data_record',
      reported_date: new Date().getTime(),
      fields: {
        patient_id: 'person'
      },
      contact: { _id: 'person2' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc('person'))
      .then(person => {
        expect(person.date_of_death).not.toBeDefined();
      });
  });

  it('should be skipped when enabled but have no matching config', () => {
    const settings = {
      transitions: { death_reporting: true },
      death_reporting: {
        mark_deceased_forms: ['DEAD'],
        undo_deceased_forms: ['UNDEAD'],
        date_field: 'date'
      },
      forms: { MAYBE_DEAD: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'MAYBE_DEAD',
      type: 'data_record',
      reported_date: new Date().getTime(),
      fields: {
        patient_id: 'person'
      },
      contact: { _id: 'person2' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc('person'))
      .then(person => {
        expect(person.date_of_death).not.toBeDefined();
      });
  });

  it('should be skipped when patient is not found', () => {
    const settings = {
      transitions: { death_reporting: true },
      death_reporting: {
        mark_deceased_forms: ['DEAD'],
        undo_deceased_forms: ['UNDEAD'],
        date_field: 'date'
      },
      forms: { DEAD: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'DEAD',
      type: 'data_record',
      reported_date: new Date().getTime(),
      fields: {
        patient_id: 'other'
      },
      contact: { _id: 'person2' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc('person'))
      .then(person => {
        expect(person.date_of_death).not.toBeDefined();
      });
  });

  it('should add date_of_death field to patient with patient_id', () => {
    const settings = {
      transitions: { death_reporting: true },
      death_reporting: {
        mark_deceased_forms: ['DEAD'],
        undo_deceased_forms: ['UNDEAD'],
        date_field: 'date'
      },
      forms: { DEAD: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'DEAD',
      type: 'data_record',
      reported_date: new Date().getTime(),
      fields: {
        patient_id: '12345'
      },
      contact: { _id: 'person2' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.death_reporting).toBeDefined();
        expect(info.transitions.death_reporting.ok).toEqual(true);
      })
      .then(() => utils.getDoc('person'))
      .then(person => {
        expect(person.date_of_death).toEqual(doc.reported_date);
      })
      .then(() => utils.getDoc('person2'))
      .then(person2 => {
        expect(person2.date_of_death).not.toBeDefined();
      });
  });

  it('should add dod field with patient_uuid linkage and custom field, not update dod and remove dod', () => {
    const settings = {
      transitions: { death_reporting: true },
      death_reporting: {
        mark_deceased_forms: ['DEAD'],
        undo_deceased_forms: ['UNDEAD'],
        date_field: 'fields.time_of_death'
      },
      forms: { DEAD: { }, UNDEAD: { } }
    };

    const doc = {
      _id: uuid(),
      form: 'DEAD',
      type: 'data_record',
      reported_date: new Date().getTime(),
      fields: {
        patient_id: 'person',
        time_of_death: 123456789
      },
      contact: { _id: 'person2' }
    };

    const doc2 = {
      _id: uuid(),
      form: 'DEAD',
      type: 'data_record',
      reported_date: new Date().getTime(),
      fields: {
        patient_id: 'person',
        time_of_death: 9876544321
      },
      contact: { _id: 'person2' }
    };

    const doc3 = {
      _id: uuid(),
      form: 'UNDEAD',
      type: 'data_record',
      reported_date: new Date().getTime(),
      fields: {
        patient_id: 'person',
      },
      contact: { _id: 'person2' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.death_reporting).toBeDefined();
        expect(info.transitions.death_reporting.ok).toEqual(true);
      })
      .then(() => utils.getDoc('person'))
      .then(person => {
        expect(person.date_of_death).toEqual(doc.fields.time_of_death);
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc('person'))
      .then(person => {
        expect(person.date_of_death).toEqual(doc.fields.time_of_death);
      })
      .then(() => utils.saveDoc(doc3))
      .then(() => sentinelUtils.waitForSentinel(doc3._id))
      .then(() => sentinelUtils.getInfoDoc(doc3._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.death_reporting).toBeDefined();
        expect(info.transitions.death_reporting.ok).toEqual(true);
      })
      .then(() => utils.getDoc('person'))
      .then(person => {
        expect(person.date_of_death).not.toBeDefined();
      });
  });

});
