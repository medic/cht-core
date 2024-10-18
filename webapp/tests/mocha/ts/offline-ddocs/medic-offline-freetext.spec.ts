import medicOfflineFreetext from '../../../../src/ts/services/offline-ddocs/medic-offline-freetext.ddoc';
import { expect } from 'chai';
import { buildViewMapFn } from '../../unit/views/utils.js';

const expectedValue = (
  {typeIndex, name, dead = false, muted = false }: Record<string, unknown> = {}
) => `${dead} ${muted} ${typeIndex} ${name}`;

describe('medic-offline-freetext', () => {
  it('has the correct _id', () => {
    expect(medicOfflineFreetext._id).to.equal('_design/medic-offline-freetext');
  });

  describe('contacts_by_freetext', () => {
    const mapFn = buildViewMapFn(medicOfflineFreetext.views.contacts_by_freetext.map);

    afterEach(() => mapFn.reset());

    [
      ['district_hospital', 0],
      ['health_center', 1],
      ['clinic', 2],
      ['person', 3],
      ['contact', 0, 'district_hospital'],
      ['contact', 1, 'health_center'],
      ['contact', 2, 'clinic'],
      ['contact', 3, 'person']
    ].forEach(([type, typeIndex, contactType]) => it('emits numerical index for default type', () => {
      const doc = { type, hello: 'world', contact_type: contactType };
      const emitted = mapFn(doc, true);
      expect(emitted).to.deep.equal([{ key: ['world'], value: expectedValue({ typeIndex }) }]);
    }));

    it('emits contact_type index for custom type', () => {
      const typeIndex = 'my_custom_type';
      const doc = { contact_type: typeIndex, type: 'contact', hello: 'world' };
      const emitted = mapFn(doc, true);
      expect(emitted).to.deep.equal([{ key: ['world'], value: expectedValue({ typeIndex }) }]);
    });

    it('emits nothing when type is invalid', () => {
      const doc = { type: 'invalid', hello: 'world' };
      const emitted = mapFn(doc, true);
      expect(emitted).to.be.empty;
    });

    it('emits death status in value', () => {
      const doc = { type: 'district_hospital', date_of_death: '2021-01-01' };
      const emitted = mapFn(doc, true);
      expect(emitted).to.deep.equal([{ key: ['2021-01-01'], value: expectedValue({ typeIndex: 0, dead: true }) }]);
    });

    it('emits muted status in value', () => {
      const doc = { type: 'district_hospital', muted: true, hello: 'world' };
      const emitted = mapFn(doc, true);
      expect(emitted).to.deep.equal([{ key: ['world'], value: expectedValue({ typeIndex: 0, muted: true }) }]);
    });

    [
      'hello', 'HeLlO'
    ].forEach(name => it('emits name in value', () => {
      const doc = { type: 'district_hospital', name };
      const emitted = mapFn(doc, true);
      expect(emitted).to.deep.equal([
        { key: [name.toLowerCase()], value: expectedValue({ typeIndex: 0, name: name.toLowerCase() }) }
      ]);
    }));

    [
      null, undefined, { hello: 'world' }, {}, 1, true
    ].forEach(hello => it('emits nothing when value is not a string', () => {
      const doc = { type: 'district_hospital', hello };
      const emitted = mapFn(doc, true);
      expect(emitted).to.be.empty;
    }));

    [
      '', 't', 'to'
    ].forEach(hello => it('emits nothing when value is too short', () => {
      const doc = { type: 'district_hospital', hello };
      const emitted = mapFn(doc, true);
      expect(emitted).to.be.empty;
    }));

    [
      '_id', '_rev', 'type', 'contact_type', 'refid', 'geolocation'
    ].forEach(key => it('emits nothing for a skipped field', () => {
      const doc = { type: 'district_hospital', [key]: 'world' };
      const emitted = mapFn(doc, true);
      expect(emitted).to.be.empty;
    }));

    it('emits nothing for fields that end with "_date"', () => {
      const doc = { type: 'district_hospital', reported_date: 'world' };
      const emitted = mapFn(doc, true);
      expect(emitted).to.be.empty;
    });

    it('emits value only once', () => {
      const doc = {
        type: 'district_hospital',
        hello: 'world world',
        hello1: 'world',
        hello3: 'world',
      };
      const emitted = mapFn(doc, true);
      expect(emitted).to.deep.equal([{ key: ['world'], value: expectedValue({ typeIndex: 0 }) }]);
    });

    it('emits each word in a string', () => {
      const doc = {
        type: 'district_hospital',
        hello: `the quick\nbrown\tfox`,
      };
      const emitted = mapFn(doc, true);

      const value =  expectedValue({ typeIndex: 0 });
      expect(emitted).to.deep.equal([
        { key: ['the'], value },
        { key: ['quick'], value },
        { key: ['brown'], value },
        { key: ['fox'], value },
      ]);
    });
  });
});
