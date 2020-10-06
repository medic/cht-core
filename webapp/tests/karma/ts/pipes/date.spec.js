const assert = require('chai').assert;
const moment = require('moment');
const sinon = require('sinon');

// TODO migrate this file!
// Moved here in advance of the migration to get the unit tests passing
// The code this is testing was already migrated and can't be "required" anymore.

const mockAngular = require('../mock-angular');
require('../../../../src/js/filters/date');
const filter = mockAngular.modules.inboxFilters.filters;

describe('date filter', () => {

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
    getRelativeDate: sinon.stub(),
    getCssSelector: () => 'update-relative-date',
    generateDataset: () => 'data-date-options="someOptions"'
  };

  const $translate = {
    instant: x => x,
  };
  const $sce = {
    trustAsHtml: x => x
  };


  describe('age', () => {
    const age = filter.age($sce, FormatDate, RelativeDate);

    it('should return nicely-formatted output', () => {
      RelativeDate.getRelativeDate.returns('76 years');
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

  describe('autoreply', () => {

    const autoreply = filter.autoreply($sce, $translate, FormatDate, RelativeDate);

    it('should return nicely-formatted output', () => {
      // expect
      assert.equal(autoreply(TEST_TASK), '<span><span class="state STATE">state.STATE</span>&nbsp;' +
        '<span class="autoreply" title="MESSAGE"><span class="autoreply-content">autoreply</span></span>&nbsp</span>');
    });

  });

  describe('dayMonth', () => {

    const dayMonth = filter.dayMonth($sce, $translate, FormatDate);

    it('should return nicely-formatted output', () => {
      // expect
      assert.equal(dayMonth(TEST_DATE), '<span>2 Jan</span>');
    });

  });

  describe('fullDate', () => {

    const fullDate = filter.fullDate($sce, FormatDate, RelativeDate);

    it('should return nicely-formatted output', () => {
      RelativeDate.getRelativeDate.returns('0 days');
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

  describe('relativeDate', () => {

    const relativeDate = filter.relativeDate($sce, FormatDate, RelativeDate);

    it('should return nicely-formatted output', () => {
      RelativeDate.getRelativeDate.returns('0 days');
      // expect
      const expected = '<span class="relative-date future" title="2046-01-02T02:14:45.558Z">' +
                         '<span class="relative-date-content update-relative-date" ' +
                         'data-date-options="someOptions">0 days</span>' +
                       '</span>';
      assert.equal(relativeDate(TEST_DATE), expected);
    });

  });

  describe('relativeDay', () => {

    const relativeDay = filter.relativeDay($sce, FormatDate, RelativeDate);

    it('should return nicely-formatted output', () => {
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

  describe('simpleDate', () => {

    const simpleDate = filter.simpleDate(FormatDate);

    it('should return nicely-formatted output', () => {
      // expect
      assert.equal(simpleDate(TEST_DATE), '2046-01-02');
    });

  });

  describe('simpleDateTime', () => {

    const simpleDateTime = filter.simpleDateTime(FormatDate);

    it('should return nicely-formatted output', () => {
      // expect
      assert.equal(simpleDateTime(TEST_DATE), '2046-01-02T02:14:45.558Z');
    });

  });

  describe('state', () => {

    const state = filter.state($sce, $translate, FormatDate, RelativeDate);

    it('should return nicely-formatted output', () => {
      // expect
      assert.equal(state(TEST_TASK), '<span><span class="state STATE">state.STATE</span>&nbsp;</span>');
    });

  });

  describe('weeksPregnant', () => {

    const weeksPregnant = filter.weeksPregnant();

    it('adds class for full term', () => {
      // given
      const weeks = { number: 37 };

      // expect
      assert.equal(weeksPregnant(weeks), '<span class="weeks-pregnant upcoming-edd">37</span>');
    });


    it('adds class for approximate dates', () => {
      // given
      const weeks = { number: 37, approximate: true };

      // expect
      assert.equal(weeksPregnant(weeks), '<span class="weeks-pregnant upcoming-edd approximate">37</span>');
    });

  });

});
