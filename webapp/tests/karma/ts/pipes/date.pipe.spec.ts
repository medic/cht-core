import { TestBed } from '@angular/core/testing';
import { assert } from 'chai';
import sinon from 'sinon';
import * as moment from 'moment';
import { DomSanitizer } from '@angular/platform-browser';

import {
  AgePipe,
  AutoreplyPipe,
  DayMonthPipe,
  FullDatePipe,
  RelativeDatePipe,
  RelativeDayPipe,
  SimpleDatePipe,
  SimpleDateTimePipe,
  StatePipe,
  WeeksPregnantPipe,
} from '@mm-pipes/date.pipe';
import { RelativeDateService } from '@mm-services/relative-date.service';
import { TranslateService } from '@ngx-translate/core';
import { FormatDateService } from '@mm-services/format-date.service';


describe('date pipe', () => {
  let relativeDateService;
  let formatDateService;
  let translateService;
  let sanitizer;

  const TEST_TASK = {
    messages: [
      { message: 'MESSAGE' },
    ],
    state: 'STATE',
  };
  const TEST_DATE = moment.utc(2398472085558);

  beforeEach(() => {
    const RelativeDateMock = {
      getRelativeDate: sinon.stub(),
      getCssSelector: () => 'update-relative-date',
      generateDataset: () => 'data-date-options="someOptions"'
    };
    const FormatDateMock = {
      age: momentDate => `${momentDate.year() - 1970} years`,
      date: d => `${d.toISOString().split('T')[0]}`,
      datetime: d => `${d.toISOString()}`,
      relative: (d:number) => `${Math.floor((d - TEST_DATE.valueOf()) / 86400000)} days`,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: RelativeDateService, useValue: RelativeDateMock },
        { provide: FormatDateService, useValue: FormatDateMock },
        { provide: TranslateService, useValue: { instant: sinon.stub().returnsArg(0) } },
        { provide: DomSanitizer, useValue: { bypassSecurityTrustHtml: sinon.stub().returnsArg(0) } },
      ],
      declarations: [
        AgePipe,
        AutoreplyPipe,
        DayMonthPipe,
        FullDatePipe,
        RelativeDayPipe,
        RelativeDatePipe,
        SimpleDateTimePipe,
        SimpleDatePipe,
        StatePipe,
        WeeksPregnantPipe,
      ]
    });
    relativeDateService = TestBed.inject(RelativeDateService);
    formatDateService = TestBed.inject(FormatDateService);
    translateService = TestBed.inject(TranslateService);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  afterEach(() => {
    sinon.restore();
  });



  describe('Age pipe', () => {
    it('should return nicely-formatted output', () => {
      relativeDateService.getRelativeDate.returns('76 years');
      const pipe = new AgePipe(formatDateService, relativeDateService, sanitizer);

      // expect
      const expected = '<span class="relative-date future age" title="2046-01-02">' +
        '<span class="relative-date-content update-relative-date" ' +
        'data-date-options="someOptions"' +
        '>' +
        '76 years' +
        '</span>' +
        '</span>';
      assert.equal(pipe.transform(TEST_DATE), expected);
    });
  });

  describe('autoreply', () => {
    it('should return nicely-formatted output', () => {
      const pipe = new AutoreplyPipe(translateService, formatDateService, relativeDateService, sanitizer);
      // expect
      assert.equal(pipe.transform(TEST_TASK), '<span><span class="state STATE">state.STATE</span>&nbsp;' +
        '<span class="autoreply" title="MESSAGE"><span class="autoreply-content">autoreply</span></span>&nbsp</span>');
    });
  });

  describe('dayMonth', () => {
    it('should return nicely-formatted output', () => {
      const pipe = new DayMonthPipe(sanitizer);
      // expect
      assert.equal(pipe.transform(TEST_DATE), '<span>2 Jan</span>');
    });
  });

  describe('fullDate', () => {
    it('should return nicely-formatted output', () => {
      relativeDateService.getRelativeDate.returns('0 days');
      const pipe = new FullDatePipe(sanitizer, formatDateService, relativeDateService);
      // expect
      const expected = '<div class="relative-date-content update-relative-date" ' +
        'data-date-options="someOptions"' +
        '>' +
        '0 days' +
        '</div>' +
        '<div class="full-date">2046-01-02T02:14:45.558Z</div>';
      assert.equal(pipe.transform(TEST_DATE), expected);
    });
  });

  describe('relativeDate', () => {
    it('should return nicely-formatted output', () => {
      relativeDateService.getRelativeDate.returns('0 days');
      const pipe = new RelativeDatePipe(sanitizer, formatDateService, relativeDateService);
      // expect
      const expected = '<span class="relative-date future" title="2046-01-02T02:14:45.558Z">' +
        '<span class="relative-date-content update-relative-date" ' +
        'data-date-options="someOptions">0 days</span>' +
        '</span>';
      assert.equal(pipe.transform(TEST_DATE), expected);
    });
  });

  describe('relativeDay', () => {
    it('should return nicely-formatted output', () => {
      relativeDateService.getRelativeDate.returns('0 days');
      const pipe = new RelativeDayPipe(sanitizer, formatDateService, relativeDateService);
      // expect
      const expected = '<span class="relative-date future" title="2046-01-02">' +
        '<span class="relative-date-content update-relative-date" ' +
        'data-date-options="someOptions"' +
        '>' +
        '0 days' +
        '</span>' +
        '</span>';
      assert.equal(pipe.transform(TEST_DATE), expected);
    });
  });

  describe('simpleDate', () => {
    it('should return nicely-formatted output', () => {
      const pipe = new SimpleDatePipe(formatDateService);
      // expect
      assert.equal(pipe.transform(TEST_DATE), '2046-01-02');
    });
  });

  describe('simpleDateTime', () => {
    it('should return nicely-formatted output', () => {
      const pipe = new SimpleDateTimePipe(formatDateService);
      // expect
      assert.equal(pipe.transform(TEST_DATE), '2046-01-02T02:14:45.558Z');
    });
  });

  describe('state', () => {
    it('should return nicely-formatted output', () => {
      const pipe = new StatePipe(translateService, formatDateService, relativeDateService, sanitizer);
      // expect
      assert.equal(pipe.transform(TEST_TASK), '<span><span class="state STATE">state.STATE</span>&nbsp;</span>');
    });
  });

  describe('weeksPregnant', () => {
    const pipe = new WeeksPregnantPipe();
    it('adds class for full term', () => {
      // given
      const weeks = { number: 37 };

      // expect
      assert.equal(pipe.transform(weeks), '<span class="weeks-pregnant upcoming-edd">37</span>');
    });


    it('adds class for approximate dates', () => {
      // given
      const weeks = { number: 37, approximate: true };

      // expect
      assert.equal(pipe.transform(weeks), '<span class="weeks-pregnant upcoming-edd approximate">37</span>');
    });
  });
});

