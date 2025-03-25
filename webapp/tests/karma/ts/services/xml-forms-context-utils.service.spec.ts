import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';

describe('XmlFormsContextUtils service', () => {
  let service:XmlFormsContextUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(XmlFormsContextUtilsService);
  });

  afterEach(() => {
    sinon.restore();
  });


  describe('ageInDays util', () => {

    it('exists', () => {
      expect(service.ageInDays).to.not.equal(undefined);
    });

    it('handles null dob', () => {
      const actual = service.ageInDays({});
      expect(actual).to.equal(undefined);
    });

    it('returns 0 when born today', () => {
      const dob = new Date();
      dob.setHours(0);
      const actual = service.ageInDays({ date_of_birth: dob });
      expect(actual).to.equal(0);
    });

    it('returns 25 when exactly 25 days old', () => {
      const dob = new Date();
      dob.setDate(dob.getDate() - 25);
      const actual = service.ageInDays({ date_of_birth: dob });
      expect(actual).to.equal(25);
    });

    it('returns 1000 when exactly 1000 days old', () => {
      const dob = new Date();
      dob.setDate(dob.getDate() - 1000);
      const actual = service.ageInDays({ date_of_birth: dob });
      expect(actual).to.equal(1000);
    });

    it('returns 1 when born yesterday even if less than 24 hours ago', () => {
      const dob = new Date();
      dob.setDate(dob.getDate() - 1);
      dob.setHours(23);
      dob.setMinutes(59);
      const actual = service.ageInDays({ date_of_birth: dob });
      expect(actual).to.equal(1);
    });

  });

  describe('ageInMonths util', () => {

    it('exists', () => {
      expect(service.ageInMonths).to.not.equal(undefined);
    });

    it('handles null dob', () => {
      const actual = service.ageInMonths({});
      expect(actual).to.equal(undefined);
    });

    it('returns 0 when less than 1 month old', () => {
      const dob = new Date();
      dob.setDate(dob.getDate() - 25);
      const actual = service.ageInMonths({ date_of_birth: dob });
      expect(actual).to.equal(0);
    });

    it('returns 11 when 11 months old', () => {
      const dob = new Date();
      dob.setMonth(dob.getMonth() - 11, 1);
      const actual = service.ageInMonths({ date_of_birth: dob });
      expect(actual).to.equal(11);
    });

    it('returns 13 when 13 months old', () => {
      const dob = new Date();
      dob.setMonth(dob.getMonth() - 13, 1);
      const actual = service.ageInMonths({ date_of_birth: dob });
      expect(actual).to.equal(13);
    });

  });

  describe('ageInYears util', () => {

    it('exists', () => {
      expect(service.ageInYears).to.not.equal(undefined);
    });

    it('handles null dob', () => {
      const actual = service.ageInYears({});
      expect(actual).to.equal(undefined);
    });

    it('returns 0 when less than 1 year old', () => {
      const dob = new Date();
      dob.setMonth(dob.getMonth() - 11, 1);
      const actual = service.ageInYears({ date_of_birth: dob });
      expect(actual).to.equal(0);
    });

    it('returns 18 when exactly 18 years', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 18);
      const actual = service.ageInYears({ date_of_birth: dob });
      expect(actual).to.equal(18);
    });

  });

  describe('normalizedLevenshteinEq', () => {
    it('should return true for a threshold of 0.4285', () => {
      // Score/distance / maxLength
      // 3 (3 characters need to be added to make str1 = str2) / 5 (Test123 is the larger string)
      // ~  0.42857142857142855
      expect(service.normalizedLevenshteinEq('Test123', 'Test', 0.42857142857142855)).to.equal(true);
    });

    it('should handle nullish arguments', () => {
      const val:any = undefined;
      expect(service.normalizedLevenshteinEq(val, 'Test', 3)).to.equal(false);
      expect(service.normalizedLevenshteinEq('Test123', val, 3)).to.equal(false);
      expect(service.normalizedLevenshteinEq('Test123', 'Test', val)).to.equal(true); // Default is 0.42857142857142855
    });

    it('should handle falsy arguments', () => {
      const falseVal: any = false;
      const zeroVal: any = 0;
      const emptyString: any = '';

      expect(service.normalizedLevenshteinEq(falseVal, falseVal)).to.equal(true);
      expect(service.normalizedLevenshteinEq(zeroVal, zeroVal)).to.equal(true);
      expect(service.normalizedLevenshteinEq(emptyString, emptyString)).to.equal(true);

      expect(service.normalizedLevenshteinEq(falseVal, zeroVal)).to.equal(false);
      expect(service.normalizedLevenshteinEq(zeroVal, emptyString)).to.equal(false);
      expect(service.normalizedLevenshteinEq(emptyString, falseVal)).to.equal(false);
    });

    it('should handle truthy arguments', () => {
      expect(service.normalizedLevenshteinEq('', '')).to.equal(true);
      expect(service.normalizedLevenshteinEq(true as any, true as any)).to.equal(true);
      expect(service.normalizedLevenshteinEq(false as any, false as any)).to.equal(true);
      expect(service.normalizedLevenshteinEq(1 as any, 2 as any)).to.equal(false);
      expect(service.normalizedLevenshteinEq([] as any, {} as any)).to.equal(false);
    });
  });

  describe('levenshteinEq', () => {
    it('should return true for a threshold of 3', () => {
      expect(service.levenshteinEq('Test123', 'Test', 3)).to.equal(true);
    });

    it('should handle nullish arguments', () => {
      const val:any = undefined;
      expect(service.levenshteinEq(val, 'Test', 3)).to.equal(false);
      expect(service.levenshteinEq('Test123', val, 3)).to.equal(false);
      expect(service.levenshteinEq('Test123', 'Test', val)).to.equal(true); // Default is 3
    });

    it('should handle falsy arguments', () => {
      const falseVal: any = false;
      const zeroVal: any = 0;
      const emptyString: any = '';

      expect(service.levenshteinEq(falseVal, falseVal)).to.equal(true);
      expect(service.levenshteinEq(zeroVal, zeroVal)).to.equal(true);
      expect(service.levenshteinEq(emptyString, emptyString)).to.equal(true);

      expect(service.levenshteinEq(falseVal, zeroVal)).to.equal(false);
      expect(service.levenshteinEq(zeroVal, emptyString)).to.equal(false);
      expect(service.levenshteinEq(emptyString, falseVal)).to.equal(false);
    });

    it('should handle truthy arguments', () => {
      expect(service.levenshteinEq('', '')).to.equal(true);
      expect(service.levenshteinEq(true as any, true as any)).to.equal(true);
      expect(service.levenshteinEq(false as any, false as any)).to.equal(true);
      expect(service.levenshteinEq(1 as any, 2 as any)).to.equal(false);
      expect(service.levenshteinEq([] as any, {} as any)).to.equal(false);
    });
  });
});
