describe('UHCSettings service', function() {

  'use strict';

  let service;

  beforeEach(function() {
    module('inboxApp');
    inject(function($injector) {
      service = $injector.get('UHCSettings');
    });
  });

  afterEach(() => sinon.restore());

  describe('getMonthStartDate', () => {
    it('should return falsy for invalid input', () => {
      chai.expect(!!service.getMonthStartDate(false)).to.equal(false);
      chai.expect(!!service.getMonthStartDate()).to.equal(false);
      chai.expect(!!service.getMonthStartDate({})).to.equal(false);
      chai.expect(!!service.getMonthStartDate({ uhc: false })).to.equal(false);
    });

    it('should return correct month_start_date', () => {
      chai.expect(service.getMonthStartDate({ uhc: { month_start_date: 3 }})).to.equal(3);
      chai.expect(service.getMonthStartDate({ uhc: { month_start_date: 3, visit_count: { month_start_date: 10 } }}))
        .to.equal(3);
      chai.expect(service.getMonthStartDate({ uhc: { visit_count: { month_start_date: 10 } }})).to.equal(10);
    });
  });

  describe('getVisitCountSettings', () => {
    it('should return empty object for invalid input', () => {
      chai.expect(service.getVisitCountSettings(false)).to.deep.equal({});
      chai.expect(service.getVisitCountSettings()).to.deep.equal({});
      chai.expect(service.getVisitCountSettings({})).to.deep.equal({});
      chai.expect(service.getVisitCountSettings({ uhc: false })).to.deep.equal({});
    });

    it('should return correct values', () => {
      let settings = {
        uhc: {
          month_start_date: 10,
          visit_count: {
            visit_count_goal: 3
          }
        }
      };

      chai.expect(service.getVisitCountSettings(settings)).to.deep.equal({ monthStartDate: 10, visitCountGoal: 3 });

      settings = {
        uhc: {
          visit_count: {
            visit_count_goal: 3,
            month_start_date: 10
          }
        }
      };

      chai.expect(service.getVisitCountSettings(settings)).to.deep.equal({ monthStartDate: 10, visitCountGoal: 3 });

      settings = {
        uhc: {
          month_start_date: 12,
          visit_count: {
            visit_count_goal: 3,
            month_start_date: 10
          }
        }
      };

      chai.expect(service.getVisitCountSettings(settings)).to.deep.equal({ monthStartDate: 12, visitCountGoal: 3 });
    });
  });

  describe('getContactsDefaultSort', () => {
    it('should return falsy when for invalid input', () => {
      chai.expect(!!service.getContactsDefaultSort(false)).to.equal(false);
      chai.expect(!!service.getContactsDefaultSort()).to.equal(false);
      chai.expect(!!service.getContactsDefaultSort({})).to.equal(false);
      chai.expect(!!service.getContactsDefaultSort({ uhc: false })).to.equal(false);
    });

    it('should return correct value', () => {
      chai.expect(service.getContactsDefaultSort({ uhc: { contacts_default_sort: 'default' } })).to.equal('default');
    });
  });
});
