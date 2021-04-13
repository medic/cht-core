const { assert, expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const emitter = rewire('../../src/contact-summary/contact-summary-emitter');

describe('contact-summary-emitter', function() {
  describe('test-setup', function() {
    it('should provide the lib', function() {
      // given
      const lib = emitter({ cards: [], fields: [] });

      // expect
      assert.isNotNull(lib);
    });
  });

  describe('cards', () => {
    it('cards is empty when appliesIf yields false', () => {
      const appliesIf = sinon.stub().returns(false);
      const cards = [
        { appliesIf },
        { appliesIf, appliesToType: 'report' },
      ];
      const report = { report: true };
      const actual = emitter({ cards }, {}, [report]);

      expect(actual).to.deep.eq({ fields: [], cards: [], context: {} });
      expect(appliesIf.args[0]).to.deep.eq([undefined]);
      expect(appliesIf.args[1]).to.deep.eq([report]);
    });

    it('appliesIf defaults to true', () => {
      const cards = [
        { appliesToType: 'report', fields: [], label: 'hello' },
      ];
      const report = { report: true };
      const actual = emitter({ cards }, {}, [report]);

      expect(actual).to.deep.eq({
        fields: [],
        cards: [{ fields: [], label: 'hello' }],
        context: {}
      });
    });

    it('allows appliesToType to be an array', () => {
      const appliesIf = sinon.stub().returns(false);
      const cards = [
        { appliesIf, appliesToType: ['report'] },
      ];
      const report = { report: true };
      emitter({ cards }, {}, [report]);

      expect(appliesIf.args[0]).to.deep.eq([report]);
    });

    it('does not add cards with appliesToType different than contact type', () => {
      const appliesIf = sinon.stub().returns(false);
      const cards = [
        { appliesIf, appliesToType: ['r', 'a'] },
      ];
      const report = { report: true };
      emitter({ cards }, { type: 'x' }, [report]);

      assert.equal(appliesIf.callCount, 0);
    });

    it('adds cards with undefined appliesToType and existing contact type', () => {
      const appliesIf = sinon.stub().returns(false);
      const cards = [
        { appliesIf },
      ];
      const report = { report: true };
      emitter({ cards }, { type: 'x' }, [report]);

      assert.equal(appliesIf.callCount, 1);
    });

    it('adds cards with undefined appliesToType and undefined contact type', () => {
      const appliesIf = sinon.stub().returns(false);
      const cards = [
        { appliesIf },
      ];
      const report = { report: true };
      emitter({ cards }, {}, [report]);

      expect(appliesIf.args[0]).to.deep.eq([undefined]);
    });

    it('thows an error if appliesToType includes the type report and another type', () => {
      const appliesIf = sinon.stub().returns(false);
      const cards = [
        { appliesIf, appliesToType: ['report', 'a'] },
      ];
      const report = { report: true };
      try {
        emitter({ cards }, { type: 'a' }, [report]);
        throw new Error('Ensures it throws');
      } catch(e) {
        expect(e.message).to.include('You cannot set appliesToType');
      }
    });

    it('should prioritize contact.type over contact.contact_type', () => {
      const appliesIf = sinon.stub().returns(false);
      const appliesIfPatient = sinon.stub().returns(false);
      const appliesIfAll = sinon.stub().returns(false);
      const cards = [
        { appliesIf: appliesIf, appliesToType: ['person'], fields: [], },
        { appliesIf: appliesIfPatient, appliesToType: ['patient'], fields: [], },
        { appliesIf: appliesIfAll, appliesToType: ['patient', 'person'], fields: [], },
      ];

      const report = { report: true };
      emitter({ cards }, { type: 'person', contact_type: 'patient' }, [report]);
      assert.equal(appliesIf.callCount, 1);
      assert.equal(appliesIfPatient.callCount, 0);
      assert.equal(appliesIfAll.callCount, 1);

      sinon.resetHistory();

      emitter({ cards }, { type: 'contact', contact_type: 'patient' }, [report]);
      assert.equal(appliesIf.callCount, 0);
      assert.equal(appliesIfPatient.callCount, 1);
      assert.equal(appliesIfAll.callCount, 1);

      sinon.resetHistory();

      emitter({ cards }, { type: 'contact', contact_type: 'neither' }, [report]);
      assert.equal(appliesIf.callCount, 0);
      assert.equal(appliesIfPatient.callCount, 0);
      assert.equal(appliesIfAll.callCount, 0);
    });
  });

  describe('fields', () => {
    it('appliesIf defaults to true', () => {
      const fields = [
        { appliesToType: ['z'] },
      ];
      const report = { report: true };
      const result = emitter({ fields }, { type: 'z' }, [report]);

      expect(result.fields).to.deep.eq(fields);
    });

    it('adds fields with appliesToType being the negative of a type different than the contact type', () => {
      const appliesIf = sinon.stub().returns(true);
      const fields = [
        { appliesIf, appliesToType: ['!r'] },
      ];
      const report = { report: true };
      const result = emitter({ fields }, { type: 'z' }, [report]);

      expect(result.fields).to.deep.eq(fields);
    });

    it('does not add fields with appliesToType being the negative of contact type', () => {
      const appliesIf = sinon.stub().returns(true);
      const fields = [
        { appliesIf, appliesToType: ['!r'] },
      ];
      const report = { report: true };
      const result = emitter({ fields }, { type: 'r' }, [report]);

      expect(result.fields).to.deep.eq([]);
    });

    it('does not add fields with one of appliesToType being the negative of the contact type', () => {
      const appliesIf = sinon.stub().returns(true);
      const fields = [
        { appliesIf, appliesToType: ['!r', 'x'] },
      ];
      const report = { report: true };
      const result = emitter({ fields }, { type: 'r' }, [report]);

      expect(result.fields).to.deep.eq([]);
    });

    it('adds fields with undefined appliesToType and defined contact type', () => {
      const appliesIf = sinon.stub().returns(true);
      const fields = [
        { appliesIf, label: 'label' },
      ];
      const report = { report: true };
      const result = emitter({ fields }, { type: 'r' }, [report]);

      expect(result.fields).to.deep.eq([{ label: 'label' }]);
    });

    it('does add fields with undefined appliesToType and undefined contact type', () => {
      const appliesIf = sinon.stub().returns(true);
      const fields = [
        { appliesIf },
      ];
      const report = { report: true };
      const result = emitter({ fields }, {}, [report]);

      expect(result.fields).to.deep.eq(fields);
    });

    it('should prioritize contact.type over contact.contact_type', () => {
      const appliesIf = sinon.stub().returns(false);
      const appliesIfPatient = sinon.stub().returns(false);
      const appliesIfAll = sinon.stub().returns(false);
      const fields = [
        { appliesIf: appliesIf, appliesToType: ['person'], },
        { appliesIf: appliesIfPatient, appliesToType: ['patient'], },
        { appliesIf: appliesIfAll, appliesToType: ['patient', 'person'], },
      ];

      const report = { report: true };
      emitter({ fields }, { type: 'person', contact_type: 'patient' }, [report]);
      assert.equal(appliesIf.callCount, 1);
      assert.equal(appliesIfPatient.callCount, 0);
      assert.equal(appliesIfAll.callCount, 1);

      sinon.resetHistory();

      emitter({ fields }, { type: 'contact', contact_type: 'patient' }, [report]);
      assert.equal(appliesIf.callCount, 0);
      assert.equal(appliesIfPatient.callCount, 1);
      assert.equal(appliesIfAll.callCount, 1);

      sinon.resetHistory();

      emitter({ fields }, { type: 'contact', contact_type: 'neither' }, [report]);
      assert.equal(appliesIf.callCount, 0);
      assert.equal(appliesIfPatient.callCount, 0);
      assert.equal(appliesIfAll.callCount, 0);
    });
  });

  describe('isReportValid', function() {
    const isReportValid = emitter.__get__('isReportValid');
    it('should return true if report has no errors property (as for xforms)', function() {
      assert.isTrue(isReportValid({}));
    });

    it('should return true if report has empty errors array (as for JSON forms)', function() {
      assert.isTrue(isReportValid({ errors:[] }));
    });

    it('should return false if report has errors', function() {
      assert.isFalse(isReportValid({ errors:['???'] }));
    });
  });
});
