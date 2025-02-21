const { loadView, buildViewMapFn } = require('./utils');
const medicOfflineFreetext = require('../../../../src/js/bootstrapper/offline-ddocs/medic-offline-freetext');
const { expect } = require('chai');

const expectedValue = (
  {typeIndex, name, dead = false, muted = false } = {}
) => `${dead} ${muted} ${typeIndex} ${name}`;

describe('contacts_by_freetext', () => {
  [
    ['online view', loadView('medic-db', 'medic-client', 'contacts_by_freetext')],
    ['offline view', buildViewMapFn(medicOfflineFreetext.views.contacts_by_freetext.map)],
  ].forEach(([name, mapFn]) => {
    describe(name, () => {
      afterEach(() => mapFn.reset());
      [
        ['district_hospital', 0],
        ['health_center', 1],
        ['clinic', 2],
        ['person', 3],
      ].forEach(([type, typeIndex]) => it(`emits numerical index [${typeIndex}] for default type`, () => {
        const doc = { type, hello: 'world' };

        const emitted = mapFn(doc, true);

        const value = expectedValue({ typeIndex });
        expect(emitted).to.deep.equal([
          { key: ['world'], value },
          { key: ['hello:world'], value }
        ]);
      }));

      [
        ['contact', 0, 'district_hospital'],
        ['contact', 1, 'health_center'],
        ['contact', 2, 'clinic'],
        ['contact', 3, 'person']
      ].forEach(([type, typeIndex, contactType]) => it(
        `emits numerical index [${typeIndex}] for default type when used as custom type`,
        () => {
          const doc = { type, hello: 'world', contact_type: contactType };

          const emitted = mapFn(doc, true);

          const value = expectedValue({ typeIndex });
          expect(emitted).to.deep.equal([
            { key: ['world'], value },
            { key: ['hello:world'], value },
            { key: [contactType], value },
            { key: [`contact_type:${contactType}`], value },
          ]);
        }
      ));

      it('emits contact_type index for custom type', () => {
        const typeIndex = 'my_custom_type';
        const doc = { contact_type: typeIndex, type: 'contact', hello: 'world' };
        const emitted = mapFn(doc, true);

        const value = expectedValue({ typeIndex });
        expect(emitted).to.deep.equal([
          { key: [typeIndex], value },
          { key: [`contact_type:${typeIndex}`], value },
          { key: ['world'], value },
          { key: ['hello:world'], value },
        ]);
      });

      [
        undefined,
        'invalid'
      ].forEach(type => it(`emits nothing when type is invalid [${type}]`, () => {
        const doc = { type, hello: 'world' };
        const emitted = mapFn(doc, true);
        expect(emitted).to.be.empty;
      }));

      it('emits death status in value', () => {
        const doc = { type: 'district_hospital', date_of_death: '2021-01-01' };

        const emitted = mapFn(doc, true);

        const value = expectedValue({ typeIndex: 0, dead: true });
        expect(emitted).to.deep.equal([
          { key: ['2021-01-01'], value },
          { key: ['date_of_death:2021-01-01'], value }
        ]);
      });

      it('emits muted status in value', () => {
        const doc = { type: 'district_hospital', muted: true, hello: 'world' };

        const emitted = mapFn(doc, true);

        const value = expectedValue({ typeIndex: 0, muted: true });
        expect(emitted).to.deep.equal([
          { key: ['world'], value },
          { key: ['hello:world'], value }
        ]);
      });

      [
        'hello', 'HeLlO'
      ].forEach(name => it(`emits name in value [${name}]`, () => {
        const doc = { type: 'district_hospital', name };

        const emitted = mapFn(doc, true);

        const value = expectedValue({ typeIndex: 0, name: name.toLowerCase() });
        expect(emitted).to.deep.equal([
          { key: [name.toLowerCase()], value },
          { key: [`name:${name.toLowerCase()}`], value }
        ]);
      }));

      [
        null, undefined, { hello: 'world' }, {}, true
      ].forEach(hello => it(`emits nothing when value is not a string or number [${JSON.stringify(hello)}]`, () => {
        const doc = { type: 'district_hospital', hello };
        const emitted = mapFn(doc, true);
        expect(emitted).to.be.empty;
      }));

      it('emits only key:value when value is number', () => {
        const doc = { type: 'district_hospital', hello: 1234 };

        const emitted = mapFn(doc, true);

        const value = expectedValue({ typeIndex: 0 });
        expect(emitted).to.deep.equal([{ key: ['hello:1234'], value }]);
      });

      [
        't', 'to'
      ].forEach(hello => it(`emits nothing but key:value when value is too short [${hello}]`, () => {
        const doc = { type: 'district_hospital', hello };

        const emitted = mapFn(doc, true);

        const value = expectedValue({ typeIndex: 0 });
        expect(emitted).to.deep.equal([{ key: [`hello:${hello}`], value }]);
      }));

      it('emits nothing when value is empty', () => {
        const doc = { type: 'district_hospital', hello: '' };
        const emitted = mapFn(doc, true);
        expect(emitted).to.be.empty;
      });

      [
        '_id', '_rev', 'type', 'refid', 'geolocation', 'Refid'
      ].forEach(key => it(`emits nothing for a skipped field [${key}]`, () => {
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

        const value = expectedValue({ typeIndex: 0 });
        expect(emitted).to.deep.equal([
          { key: ['world'], value },
          { key: ['hello:world world'], value },
          { key: ['hello1:world'], value },
          { key: ['hello3:world'], value }
        ]);
      });

      it('emits each word in a string', () => {
        const doc = {
          type: 'district_hospital',
          hello: `the quick\nBrown\tfox`,
        };
        const emitted = mapFn(doc, true);

        const value =  expectedValue({ typeIndex: 0 });
        expect(emitted).to.deep.equal([
          { key: ['the'], value },
          { key: ['quick'], value },
          { key: ['brown'], value },
          { key: ['fox'], value },
          { key: ['hello:the quick\nbrown\tfox'], value },
        ]);
      });

      it('emits non-ascii values', () => {
        const doc = { type: 'district_hospital', name: 'बुद्ध Élève' };

        const emitted = mapFn(doc, true);

        const value = expectedValue({ typeIndex: 0, name: 'बुद्ध élève' });
        expect(emitted).to.deep.equal([
          { key: ['बुद्ध'], value },
          { key: ['élève'], value },
          { key: ['name:बुद्ध élève'], value }
        ]);
      });
    });
  });
});
