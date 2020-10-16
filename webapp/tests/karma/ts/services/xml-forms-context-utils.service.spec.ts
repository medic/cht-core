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
});
