import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';

describe('UHCSettings service', () => {
  let service: UHCSettingsService;

  beforeEach(() => {
    service = TestBed.inject(UHCSettingsService);
  });

  afterEach(() => {
    sinon.restore()
  });

  describe('getMonthStartDate', () => {
    it('should return falsy for invalid input', () => {
      expect(!!service.getMonthStartDate(false)).to.equal(false);
      expect(!!service.getMonthStartDate({})).to.equal(false);
      expect(!!service.getMonthStartDate({ uhc: false })).to.equal(false);
    });

    it('should return correct month_start_date', () => {
      expect(service.getMonthStartDate({ uhc: { month_start_date: 3 }})).to.equal(3);
      expect(service.getMonthStartDate({ uhc: { month_start_date: 3, visit_count: { month_start_date: 10 } }}))
        .to.equal(3);
      expect(service.getMonthStartDate({ uhc: { visit_count: { month_start_date: 10 } }})).to.equal(10);
    });
  });

  describe('getVisitCountSettings', () => {
    it('should return empty object for invalid input', () => {
      expect(service.getVisitCountSettings(false)).to.deep.equal({});
      expect(service.getVisitCountSettings({})).to.deep.equal({});
      expect(service.getVisitCountSettings({ uhc: false })).to.deep.equal({});
    });

    it('should return correct values', () => {
      let settings:any = {
        uhc: {
          month_start_date: 10,
          visit_count: {
            visit_count_goal: 3
          }
        }
      };

      expect(service.getVisitCountSettings(settings)).to.deep.equal({ monthStartDate: 10, visitCountGoal: 3 });

      settings = {
        uhc: {
          visit_count: {
            visit_count_goal: 3,
            month_start_date: 10
          }
        }
      };

      expect(service.getVisitCountSettings(settings)).to.deep.equal({ monthStartDate: 10, visitCountGoal: 3 });

      settings = {
        uhc: {
          month_start_date: 12,
          visit_count: {
            visit_count_goal: 3,
            month_start_date: 10
          }
        }
      };

      expect(service.getVisitCountSettings(settings)).to.deep.equal({ monthStartDate: 12, visitCountGoal: 3 });
    });
  });

  describe('getContactsDefaultSort', () => {
    it('should return falsy when for invalid input', () => {
      expect(!!service.getContactsDefaultSort(false)).to.equal(false);
      expect(!!service.getContactsDefaultSort({})).to.equal(false);
      expect(!!service.getContactsDefaultSort({ uhc: false })).to.equal(false);
    });

    it('should return correct value', () => {
      expect(service.getContactsDefaultSort({ uhc: { contacts_default_sort: 'default' } })).to.equal('default');
    });
  });
});
