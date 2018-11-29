const assert = require('chai').assert,
      moment = require('moment');

const mockAngular = require('../mock-angular');
require('../../../../src/js/filters/date');
const filter = mockAngular.modules.inboxFilters.filters;

describe('date filter', function() {

  const TEST_DATE = moment.utc(2398472085558);

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

  const RelativeDate = {
    getCssSelector: () => {
      return 'update-relative-date';
    },
    generateDataset: () => {
      return 'data-date-options="someOptions"';
    }
  };

  const $translate = {
    instant: x => x,
  };
  const $sce = {
    trustAsHtml: x => x
  };


  describe('age', function() {
    const age = filter.age(FormatDate, RelativeDate, $sce);

    it('should return nicely-formatted output', function() {
      // expect
      const expected = '<span class="relative-date future age" title="2046-01-02">' +
                         '<span class="relative-date-content update-relative-date" ' +
                           'data-date-options="someOptions"' +
                         '>' +
                           '76 years' +
                         '</span>' +
                       '</span>';
      assert.equal(age(TEST_DATE), expected);
    });

  });

  describe('autoreply', function() {

    const autoreply = filter.autoreply(FormatDate, RelativeDate, $translate, $sce);

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

    const fullDate = filter.fullDate(FormatDate, RelativeDate, $sce);

    it('should return nicely-formatted output', function() {
      // expect
      const expected = '<div class="relative-date-content update-relative-date" ' +
                         'data-date-options="someOptions"' +
                       '>' +
                         '0 days' +
                       '</div>' +
                       '<div class="full-date">2046-01-02T02:14:45.558Z</div>';
      assert.equal(fullDate(TEST_DATE), expected);
    });

  });

  describe('relativeDate', function() {

    const relativeDate = filter.relativeDate(FormatDate, RelativeDate, $sce);

    it('should return nicely-formatted output', function() {
      // expect
      const expected = '<span class="relative-date future" title="2046-01-02T02:14:45.558Z">' +
                         '<span class="relative-date-content update-relative-date" data-date-options="someOptions">0 days</span>' +
                       '</span>';
      assert.equal(relativeDate(TEST_DATE), expected);
    });

  });

  describe('relativeDay', function() {

    const relativeDay = filter.relativeDay(FormatDate, RelativeDate, $sce);

    it('should return nicely-formatted output', function() {
      // expect
      const expected = '<span class="relative-date future" title="2046-01-02">' +
                         '<span class="relative-date-content update-relative-date" ' +
                           'data-date-options="someOptions"' +
                         '>' +
                           '0 days' +
                         '</span>' +
                       '</span>';
      assert.equal(relativeDay(TEST_DATE), expected);
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

    const state = filter.state(FormatDate, RelativeDate, $translate, $sce);

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
