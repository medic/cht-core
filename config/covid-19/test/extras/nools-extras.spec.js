const { expect } = require('chai');
const extras = require('../../nools-extras');

describe('Nools Extras', () => {
  describe('addDays()', () => {
    const now = '2021-09-07T00:00:00.000Z';

    it('should add days correctly ', () => {
      expect(extras.addDays(now, 1).toISOString()).to.equal('2021-09-07T21:00:00.000Z');
      expect(extras.addDays(now, 17).toISOString()).to.equal('2021-09-23T21:00:00.000Z');
      expect(extras.addDays(now, 45).toISOString()).to.equal('2021-10-21T21:00:00.000Z');
      expect(extras.addDays(now, 100).toISOString()).to.equal('2021-12-15T21:00:00.000Z');
    });
  });

  describe('getField()', () => {
    const nestedValue = { fields: { a: { b: 'value' } } };

    it('should return value when it can find the field', () => {
      expect(extras.getField(nestedValue, 'a.b')).to.equal('value');
      expect(extras.getField(nestedValue, 'a')).to.deep.equal({ b: 'value' });
    });

    it('should return undefined when it cannot find the field', () => {
      expect(extras.getField(nestedValue, undefined)).to.be.undefined;
      expect(extras.getField(nestedValue, '')).to.be.undefined;
      expect(extras.getField(nestedValue, 'a.c')).to.be.undefined;
      expect(extras.getField(nestedValue, 'x')).to.be.undefined;
      expect(extras.getField(undefined, 'a')).to.be.undefined;
      expect(extras.getField(nestedValue, 'a.b.c')).to.be.undefined;
      expect(extras.getField(nestedValue, 'a.b.c.d')).to.be.undefined;
    });
  });

  describe('isFormArraySubmittedInWindow()', () => {
    it('should return true when reports are in the range', () => {
      const start = 1630946795000;
      const end = 1630946796000;
      const forms = ['form_1', 'form_2'];
      const reports = [
        { form: 'form_0', reported_date: 1630946795000 },
        { form: 'form_1', reported_date: 1630946794000 },
        { form: 'form_1', reported_date: 1630946795000 },
        { form: 'form_2', reported_date: 1630946795400 },
        { form: 'form_3', reported_date: 1630946797000 },
        { form: 'form_2', reported_date: 1630946797200 },
      ];

      expect(extras.isFormArraySubmittedInWindow(reports, forms, start, end)).to.equal(true);
    });

    it('should return false when reports arent in the range or doesnt match form names', () => {
      const start = 1630946795000;
      const end = 1630946796000;
      const forms = ['form_1', 'form_2'];
      const reports = [
        { form: 'form_0', reported_date: 1630946795000 },
        { form: 'form_3', reported_date: 1630946797000 },
        { form: 'form_1', reported_date: 1630946790000 },
        { form: 'form_2', reported_date: 1630946799000 },
      ];

      expect(extras.isFormArraySubmittedInWindow(reports, forms, start, end)).to.equal(false);
    });

    it('should return false when no reports or not forms provided', () => {
      const start = 1630946795000;
      const end = 1630946796000;
      const forms = ['form_1', 'form_2'];
      const reports = [
        { form: 'form_1', reported_date: 1630946795000 },
        { form: 'form_2', reported_date: 1630946795400 },
      ];

      expect(extras.isFormArraySubmittedInWindow(undefined, forms, start, end)).to.equal(false);
      expect(extras.isFormArraySubmittedInWindow(reports, undefined, start, end)).to.equal(false);
    });

    it('should return true when submitted reports reaches the count number', () => {
      const start = 1630946795000;
      const end = 1630946796000;
      const forms = ['form_1', 'form_2'];
      const reports = [
        { form: 'form_0', reported_date: 1630946795000 },
        { form: 'form_1', reported_date: 1630946794000 },
        { form: 'form_1', reported_date: 1630946795000 },
        { form: 'form_1', reported_date: 1630946795200 },
        { form: 'form_2', reported_date: 1630946795400 },
        { form: 'form_3', reported_date: 1630946797000 },
        { form: 'form_2', reported_date: 1630946797200 },
      ];

      expect(extras.isFormArraySubmittedInWindow(reports, forms, start, end, 3)).to.equal(true);
    });

    it('should return false when submitted reports doesnt reach the count number', () => {
      const start = 1630946795000;
      const end = 1630946796000;
      const forms = ['form_1', 'form_2'];
      const reports = [
        { form: 'form_0', reported_date: 1630946795000 },
        { form: 'form_1', reported_date: 1630946794000 },
        { form: 'form_1', reported_date: 1630946795000 },
        { form: 'form_3', reported_date: 1630946797000 },
        { form: 'form_2', reported_date: 1630946797200 },
      ];

      expect(extras.isFormArraySubmittedInWindow(reports, forms, start, end, 3)).to.equal(false);
    });
  });
});
