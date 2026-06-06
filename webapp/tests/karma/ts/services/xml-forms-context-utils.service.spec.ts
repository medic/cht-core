import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

describe('XmlFormsContextUtils service', () => {
  let service: XmlFormsContextUtilsService;
  let utils;
  let getExtensionLib;
  let chtDatasourceService;

  beforeEach(async () => {
    getExtensionLib = sinon.stub();
    chtDatasourceService = {
      get: sinon.stub().resolves({ v1: { getExtensionLib } }),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: CHTDatasourceService, useValue: chtDatasourceService },
      ]
    });
    service = TestBed.inject(XmlFormsContextUtilsService);
    utils = await service.get();
  });

  afterEach(() => {
    sinon.restore();
  });


  describe('ageInDays util', () => {

    it('exists', () => {
      expect(utils.ageInDays).to.not.equal(undefined);
    });

    it('handles null dob', () => {
      const actual = utils.ageInDays({});
      expect(actual).to.equal(undefined);
    });

    it('returns 0 when born today', () => {
      const dob = new Date();
      dob.setHours(0);
      const actual = utils.ageInDays({ date_of_birth: dob });
      expect(actual).to.equal(0);
    });

    it('returns 25 when exactly 25 days old', () => {
      const dob = new Date();
      dob.setDate(dob.getDate() - 25);
      const actual = utils.ageInDays({ date_of_birth: dob });
      expect(actual).to.equal(25);
    });

    it('returns 1000 when exactly 1000 days old', () => {
      const dob = new Date();
      dob.setDate(dob.getDate() - 1000);
      const actual = utils.ageInDays({ date_of_birth: dob });
      expect(actual).to.equal(1000);
    });

    it('returns 1 when born yesterday even if less than 24 hours ago', () => {
      const dob = new Date();
      dob.setDate(dob.getDate() - 1);
      dob.setHours(23);
      dob.setMinutes(59);
      const actual = utils.ageInDays({ date_of_birth: dob });
      expect(actual).to.equal(1);
    });

  });

  describe('ageInMonths util', () => {

    it('exists', () => {
      expect(utils.ageInMonths).to.not.equal(undefined);
    });

    it('handles null dob', () => {
      const actual = utils.ageInMonths({});
      expect(actual).to.equal(undefined);
    });

    it('returns 0 when less than 1 month old', () => {
      const dob = new Date();
      dob.setDate(dob.getDate() - 25);
      const actual = utils.ageInMonths({ date_of_birth: dob });
      expect(actual).to.equal(0);
    });

    it('returns 11 when 11 months old', () => {
      const dob = new Date();
      dob.setMonth(dob.getMonth() - 11, 1);
      const actual = utils.ageInMonths({ date_of_birth: dob });
      expect(actual).to.equal(11);
    });

    it('returns 13 when 13 months old', () => {
      const dob = new Date();
      dob.setMonth(dob.getMonth() - 13, 1);
      const actual = utils.ageInMonths({ date_of_birth: dob });
      expect(actual).to.equal(13);
    });

  });

  describe('ageInYears util', () => {

    it('exists', () => {
      expect(utils.ageInYears).to.not.equal(undefined);
    });

    it('handles null dob', () => {
      const actual = utils.ageInYears({});
      expect(actual).to.equal(undefined);
    });

    it('returns 0 when less than 1 year old', () => {
      const dob = new Date();
      dob.setMonth(dob.getMonth() - 11, 1);
      const actual = utils.ageInYears({ date_of_birth: dob });
      expect(actual).to.equal(0);
    });

    it('returns 18 when exactly 18 years', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 18);
      const actual = utils.ageInYears({ date_of_birth: dob });
      expect(actual).to.equal(18);
    });

  });

  describe('normalizedLevenshteinEq', () => {
    it('should return true for a threshold of 0.4285', () => {
      // Score/distance / maxLength
      // 3 (3 characters need to be added to make str1 = str2) / 5 (Test123 is the larger string)
      // ~  0.42857142857142855
      expect(utils.normalizedLevenshteinEq('Test123', 'Test', 0.42857142857142855)).to.equal(true);
    });

    it('should handle nullish arguments', () => {
      const val:any = undefined;
      expect(utils.normalizedLevenshteinEq(val, 'Test', 3)).to.equal(false);
      expect(utils.normalizedLevenshteinEq('Test123', val, 3)).to.equal(false);
      expect(utils.normalizedLevenshteinEq('Test123', 'Test', val)).to.equal(true); // Default is 0.42857142857142855
    });

    it('should handle falsy arguments', () => {
      const falseVal: any = false;
      const zeroVal: any = 0;
      const emptyString: any = '';

      expect(utils.normalizedLevenshteinEq(falseVal, falseVal)).to.equal(true);
      expect(utils.normalizedLevenshteinEq(zeroVal, zeroVal)).to.equal(true);
      expect(utils.normalizedLevenshteinEq(emptyString, emptyString)).to.equal(true);

      expect(utils.normalizedLevenshteinEq(falseVal, zeroVal)).to.equal(false);
      expect(utils.normalizedLevenshteinEq(zeroVal, emptyString)).to.equal(false);
      expect(utils.normalizedLevenshteinEq(emptyString, falseVal)).to.equal(false);
    });

    it('should handle truthy arguments', () => {
      expect(utils.normalizedLevenshteinEq('', '')).to.equal(true);
      expect(utils.normalizedLevenshteinEq(true as any, true as any)).to.equal(true);
      expect(utils.normalizedLevenshteinEq(false as any, false as any)).to.equal(true);
      expect(utils.normalizedLevenshteinEq(1 as any, 2 as any)).to.equal(false);
      expect(utils.normalizedLevenshteinEq([] as any, {} as any)).to.equal(false);
    });
  });

  describe('levenshteinEq', () => {
    it('should return true for a threshold of 3', () => {
      expect(utils.levenshteinEq('Test123', 'Test', 3)).to.equal(true);
    });

    it('should handle nullish arguments', () => {
      const val:any = undefined;
      expect(utils.levenshteinEq(val, 'Test', 3)).to.equal(false);
      expect(utils.levenshteinEq('Test123', val, 3)).to.equal(false);
      expect(utils.levenshteinEq('Test123', 'Test', val)).to.equal(true); // Default is 3
    });

    it('should handle falsy arguments', () => {
      const falseVal: any = false;
      const zeroVal: any = 0;
      const emptyString: any = '';

      expect(utils.levenshteinEq(falseVal, falseVal)).to.equal(true);
      expect(utils.levenshteinEq(zeroVal, zeroVal)).to.equal(true);
      expect(utils.levenshteinEq(emptyString, emptyString)).to.equal(true);

      expect(utils.levenshteinEq(falseVal, zeroVal)).to.equal(false);
      expect(utils.levenshteinEq(zeroVal, emptyString)).to.equal(false);
      expect(utils.levenshteinEq(emptyString, falseVal)).to.equal(false);
    });

    it('should handle truthy arguments', () => {
      expect(utils.levenshteinEq('', '')).to.equal(true);
      expect(utils.levenshteinEq(true as any, true as any)).to.equal(true);
      expect(utils.levenshteinEq(false as any, false as any)).to.equal(true);
      expect(utils.levenshteinEq(1 as any, 2 as any)).to.equal(false);
      expect(utils.levenshteinEq([] as any, {} as any)).to.equal(false);
    });
  });

  describe('extensionLib', () => {

    it('exists', () => {
      expect(utils.extensionLib).to.not.equal(undefined);
    });

    it('should call extension lib with correct arguments and return its result', () => {
      const libFn = sinon.stub().returns(42);
      getExtensionLib.withArgs('mylib.js').returns(libFn);

      const result = utils.extensionLib('mylib.js', 'arg1', 'arg2');

      expect(result).to.equal(42);
      expect(getExtensionLib.calledOnceWithExactly('mylib.js')).to.be.true;
      expect(libFn.calledOnceWithExactly('arg1', 'arg2')).to.be.true;
    });

    it('should throw error when lib is not found', () => {
      getExtensionLib.returns(undefined);

      expect(() => utils.extensionLib('unknown.js')).to.throw(
        'Configuration error: no extension-lib with ID "unknown.js" found'
      );
    });

    it('should pass multiple arguments correctly', () => {
      const libFn = sinon.stub().returns('result');
      getExtensionLib.returns(libFn);

      utils.extensionLib('lib.js', 1, 'two', { three: 3 }, [4]);

      expect(libFn.calledOnceWithExactly(1, 'two', { three: 3 }, [4])).to.be.true;
    });

    it('should work with no extra arguments', () => {
      const libFn = sinon.stub().returns('no-args');
      getExtensionLib.returns(libFn);

      const result = utils.extensionLib('lib.js');

      expect(result).to.equal('no-args');
      expect(libFn.calledOnceWithExactly()).to.be.true;
    });
  });
});
