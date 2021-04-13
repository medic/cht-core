const { assert, expect } = require('chai');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const rewire = require('rewire');

const compileContactSummary = rewire('../../src/lib/compile-contact-summary');

const BASE_DIR = path.join(__dirname, '../data/compile-contact-summary');

const genMocks = () => ({
  fs: {
    exists: sinon.stub(),
    read: sinon.stub(),
  },
  pack: sinon.stub().returns('code'),
});

describe('compile-contact-summary', () => {
  beforeEach(() => sinon.useFakeTimers(1));
  afterEach(() => sinon.restore());

  describe('mocked scenarios', () => {
    it('no contact-summary files yields exception', () =>
      compileContactSummary(`${BASE_DIR}/empty`)
        .then(() => assert.fail('Expected compilation error'))
        .catch(err => {
          expect(err.message).to.include('Could not find contact-summary');
        })
    );

    it('multiple contact-summary files yields exception', () => {
      const mocks = genMocks();
      mocks.fs.exists
        .withArgs('/project/contact-summary.js').returns(true)
        .withArgs('/project/contact-summary.templated.js').returns(true);
      mocks.fs.read.withArgs('/rules.nools.js').returns('define Target {_id: null}');

      return compileContactSummary.__with__(mocks)(() => compileContactSummary('/project'))
        .then(() => assert.fail('Expected compilation error'))
        .catch(err => {
          expect(err.message).to.include('contact-summary.js and');
        });
    });

    it('package and use templated file', () => {
      const expectedProjectPath = '/project';
      const options = {};
      const mocks = genMocks();
      mocks.fs.exists
        .withArgs('/project/contact-summary.js').returns(false)
        .withArgs('/project/contact-summary.templated.js').returns(true);

      return compileContactSummary
        .__with__(mocks)(() => compileContactSummary(expectedProjectPath, options))
        .then(actualCode => {
          expect(actualCode).to.eq('var ContactSummary = {}; code return ContactSummary;');
          expect(mocks.pack.callCount).to.eq(1);

          const [actualProjectPath, actualEntryPath, actualLintPath, actualOptions] = mocks.pack.args[0];
          expect(actualProjectPath).to.eq(expectedProjectPath);
          expect(path.basename(actualEntryPath)).to.eq('lib.js');
          expect(fs.existsSync(actualEntryPath)).to.eq(true);

          expect(path.basename(actualLintPath)).to.eq('.eslintrc');
          expect(fs.existsSync(actualLintPath)).to.eq(true);

          expect(actualOptions).to.deep.eq({ libraryTarget: 'ContactSummary' });
        });
    });
  });

  describe('file based scenarios', () => {
    const options = { minifyScripts: true };
    const evalInContext = (js, contact, reports, lineage) => new Function('contact', 'reports', 'lineage', js)(contact, reports, lineage);

    it('pack a simple file', async () => {
      // when
      const compiled = await compileContactSummary(`${BASE_DIR}/verbatim`, options);

      // then
      expect(compiled).to.include('contact.x=\'a string\'');
    });

    it('legacy script', async () => {
      // when
      const compiled = await compileContactSummary(`${BASE_DIR}/legacy`, options);

      // then
      expect(compiled).to.include('contact.x=\'from original\'');
      expect(compiled).to.include('reports.y=\'from included\'');

      const contact = { foo: 'bar' };
      const reports = {};

      const result = evalInContext(compiled, contact, reports, []);
      expect(result).to.deep.eq({
        fields: [{
          label: 'testing',
          value: 5,
        }],
        context: {
          foo: 'bar',
        },
      });
      expect(contact.x).to.eq('from original');
      expect(contact.foo).to.eq('bar');
      expect(reports.y).to.eq('from included');
    });

    it('templated script', async () => {
      // when
      const compiled = await compileContactSummary(`${BASE_DIR}/templated`, options);

      // then
      const contact = {
        foo: 'bar',
        type: 'person',
        date_of_birth: 1500,
      };
      const reports = {};

      const result = evalInContext(compiled, contact, reports, []);
      expect(result).to.deep.eq({
        fields: [
          {
            label: 'testing',
            value: 5,
          },
          {
            filter: 'age',
            label: 'contact.age',
            value: 1500,
            width: 3,
          },
        ],
        context: {
          foo: 'bar',
          muted: false,
        },
        cards: [
          {
            fields: [],
            label: 'card1'
          }
        ],
      });

      const otherContact = { type: 'clinic' };
      const otherResult = evalInContext(compiled, otherContact, {}, []);
      expect(otherResult).to.deep.eq({
        fields: [
          {
            label: 'not.a.person',
            value: 'clinic',
            width: 3,
          },
        ],
        context: {
          foo: 'bar',
          muted: undefined,
        },
        cards: [
          {
            fields: [],
            label: 'card2',
          }
        ],
      });

    });

    it('configurable hierarchies', async () => {
      // when
      const compiled = await compileContactSummary(`${BASE_DIR}/configurable-hierarchies`, options);

      const patient = {
        type: 'contact',
        contact_type: 'patient',
        date_of_birth: 'Oct 10 2015',
      };
      const resultPatient = evalInContext(compiled, patient, {}, []);
      expect(resultPatient).to.deep.equal({
        fields: [
          {
            label: 'testing',
            value: 5,
          },
          {
            filter: 'age',
            label: 'contact.age',
            value: 'Oct 10 2015',
            width: 3,
          },
          {
            label: 'everyone.except.chw',
            value: 100,
            width: 3,
          },
        ],
        context: {
          foo: 'bar',
          muted: false,
        },
        cards: [
          {
            fields: [],
            label: 'for.patient'
          }
        ],
      });

      const chw = {
        type: 'contact',
        contact_type: 'chw',
        phone: '555 8758',
      };
      const resultChw = evalInContext(compiled, chw, {}, []);
      expect(resultChw).to.deep.equal({
        fields: [
          {
            filter: 'phone',
            label: 'contact.phone',
            value: '555 8758',
          },
        ],
        context: {
          foo: 'bar',
          muted: false,
        },
        cards: [
          {
            fields: [],
            label: 'for.chw'
          }
        ],
      });

      const clinic = {
        type: 'contact',
        contact_type: 'clinic',
        place_id: '22222',
      };
      const resultClinic = evalInContext(compiled, clinic, {}, []);
      expect(resultClinic).to.deep.equal({
        fields: [
          {
            label: 'everyone.except.chw',
            value: 100,
            width: 3,
          },
          {
            label: 'contact.place_id',
            value: '22222',
            width: 2,
          },
        ],
        context: {
          foo: 'bar',
          muted: false,
        },
        cards: [
          {
            fields: [],
            label: 'for.clinic'
          }
        ],
      });
    });
  });
});
