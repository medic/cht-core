const { loadView, buildViewMapFn } = require('./utils');
const medicOfflineFreetext = require('../../../../src/js/bootstrapper/offline-ddocs/medic-offline-freetext');
const { expect } = require('chai');

const createReport = (data = {}) => {
  return {
    type: 'data_record',
    form: 'test',
    reported_date: 1466466049001,
    ...data,
  };
};

describe('reports_by_freetext', () => {
  [
    ['online view', loadView('medic-db', 'medic-client', 'reports_by_freetext')],
    ['offline view', buildViewMapFn(medicOfflineFreetext.views.reports_by_freetext.map)],
  ].forEach(([name, mapFn]) => {
    describe(name, () => {
      afterEach(() => mapFn.reset());

      [
        undefined,
        'invalid',
        'contact',
        'person',
      ].forEach(type => it('emits nothing when type is invalid', () => {
        const doc = createReport({ type });
        const emitted = mapFn(doc, true);
        expect(emitted).to.be.empty;
      }));

      [
        undefined,
        null,
        '',
      ].forEach(form => it('emits nothing when form is not valued', () => {
        const doc = createReport({ form });
        const emitted = mapFn(doc, true);
        expect(emitted).to.be.empty;
      }));

      [
        null, undefined, { hello: 'world' }, {}, true
      ].forEach(hello => it('emits nothing for a field when value is not a string or number', () => {
        const doc = createReport({ hello });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
        ]);
      }));

      it('emits only key:value for field when value is number', () => {
        const doc = createReport({ hello: 1234 });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
          { key: ['hello:1234'], value: doc.reported_date }
        ]);
      });

      [
        't', 'to'
      ].forEach(hello => it('emits nothing but key:value when value is too short', () => {
        const doc = createReport({ hello });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
          { key: [`hello:${hello}`], value: doc.reported_date }
        ]);
      }));

      it('emits nothing for field when value is empty', () => {
        const doc = createReport({ hello: '' });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
        ]);
      });

      [
        '_id', '_rev', 'refid', 'content', 'Refid',
      ].forEach(key => it(`emits nothing for a skipped field: ${key}`, () => {
        const doc = createReport({ [key]: 'world' });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
        ]);
      }));

      it('emits nothing for fields that end with "_date"', () => {
        const doc = createReport({ birth_date: 'world' });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
        ]);
      });

      it('emits value only once', () => {
        const doc = createReport({
          hello: 'world world',
          hello1: 'world',
          hello3: 'world',
        });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
          { key: ['world'], value: doc.reported_date },
          { key: ['hello:world world'], value: doc.reported_date },
          { key: ['hello1:world'], value: doc.reported_date },
          { key: ['hello3:world'], value: doc.reported_date }
        ]);
      });

      it('normalizes keys and values to lowercase', () => {
        const doc = createReport({ HeLlo: 'WoRlD', NBR: 1234 });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
          { key: ['world'], value: doc.reported_date },
          { key: ['hello:world'], value: doc.reported_date },
          { key: ['nbr:1234'], value: doc.reported_date },
        ]);
      });

      it('emits each word in a string', () => {
        const doc = createReport({ hello: `the quick\nBrown\tfox` });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
          { key: ['the'], value: doc.reported_date },
          { key: ['quick'], value: doc.reported_date },
          { key: ['brown'], value: doc.reported_date },
          { key: ['fox'], value: doc.reported_date },
          { key: ['hello:the quick\nbrown\tfox'], value: doc.reported_date },
        ]);
      });

      it('emits non-ascii values', () => {
        const doc = createReport({ name: 'बुद्ध Élève' });

        const emitted = mapFn(doc, true);

        expect(emitted).to.deep.equal([
          { key: ['test'], value: doc.reported_date },
          { key: ['form:test'], value: doc.reported_date },
          { key: ['बुद्ध'], value: doc.reported_date },
          { key: ['élève'], value: doc.reported_date },
          { key: ['name:बुद्ध élève'], value: doc.reported_date }
        ]);
      });
    });
  });
});
