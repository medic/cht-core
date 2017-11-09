const assert = require('chai').assert;

const mockAngular = require('../mock-angular');
require('../../../../static/js/filters/date');
const filter = mockAngular.modules.inboxFilters.filters;

describe('date filter', function() {
  
  const TEST_DATE = new Date(2398472085558);

  const TEST_TASK = {
    messages: [
      { message: 'MESSAGE' },
    ],
    state: 'STATE',
  };

  const FormatDate = {
    age: momentDate => `${momentDate.year() - 1970} years`,
    date: d => `${d.toISOString().split('T')[0]}`,
    datetime: d => `${d.toISOString()}`,
    relative: d => `${Math.floor((d - TEST_DATE) / 86400000)} days`,
  };
  const $translate = {
    instant: x => x,
  };

  describe('age', function() {

    const age = filter.age(FormatDate);

    it('should return nicely-formatted output', function() {
      // expect
      assert.equal(age(TEST_DATE), '<span class="relative-date future" title="2046-01-02"><span class="relative-date-content">76 years</span></span>');
    });

  });

  describe('autoreply', function() {

    const autoreply = filter.autoreply(FormatDate, $translate);

    it('should return nicely-formatted output', function() {
      // expect
      assert.equal(autoreply(TEST_TASK), '<span><span class="state STATE">state.STATE</span>&nbsp;<span class="autoreply" title="MESSAGE"><span class="autoreply-content">autoreply</span></span>&nbsp</span>');
    });

  });

  describe('dayMonth', function() {

    const dayMonth = filter.dayMonth(FormatDate, $translate);

    it('should return nicely-formatted output', function() {
      // expect
      assert.equal(dayMonth(TEST_DATE), '<span>2 Jan</span>');
    });

  });

  describe('fullDate', function() {

    const fullDate = filter.fullDate(FormatDate);

    it('should return nicely-formatted output', function() {
      // expect
      assert.equal(fullDate(TEST_DATE), '<div class="relative-date-content">0 days</div><div class="full-date">2046-01-02T02:14:45.558Z</div>');
    });

  });

  describe('relativeDate', function() {

    const relativeDate = filter.relativeDate(FormatDate);

    it('should return nicely-formatted output', function() {
      // expect
      assert.equal(relativeDate(TEST_DATE), '<span class="relative-date future" title="2046-01-02T02:14:45.558Z"><span class="relative-date-content">0 days</span></span>');
    });

  });

  describe('relativeDay', function() {

    const relativeDay = filter.relativeDay(FormatDate);

    it('should return nicely-formatted output', function() {
      // expect
      assert.equal(relativeDay(TEST_DATE), '<span class="relative-date future" title="2046-01-02"><span class="relative-date-content">0 days</span></span>');
    });

  });

  describe('simpleDate', function() {

    const simpleDate = filter.simpleDate(FormatDate);

    it('should return nicely-formatted output', function() {
      // expect
      assert.equal(simpleDate(TEST_DATE), '2046-01-02');
    });

  });

  describe('simpleDateTime', function() {

    const simpleDateTime = filter.simpleDateTime(FormatDate);

    it('should return nicely-formatted output', function() {
      // expect
      assert.equal(simpleDateTime(TEST_DATE), '2046-01-02T02:14:45.558Z');
    });

  });

  describe('state', function() {

    const state = filter.state(FormatDate, $translate);

    it('should return nicely-formatted output', function() {
      // expect
      assert.equal(state(TEST_TASK), '<span><span class="state STATE">state.STATE</span>&nbsp;</span>');
    });

  });

  describe('weeksPregnant', function() {

    const weeksPregnant = filter.weeksPregnant(FormatDate);

    it('should return nicely-formatted output', function() {
      // given
      const weeks = { number: 99 };

      // expect
      assert.equal(weeksPregnant(weeks), '<span class="upcoming-edd">99</span>');
    });

  });

});
