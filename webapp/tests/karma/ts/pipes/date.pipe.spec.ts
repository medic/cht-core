import { async, TestBed } from '@angular/core/testing';
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
import { of } from 'rxjs';


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
    const translateServiceMock = {
      instant: sinon.stub().returnsArg(0),
      get: sinon.stub().callsFake(arg => of([arg])),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: RelativeDateService, useValue: RelativeDateMock },
        { provide: FormatDateService, useValue: FormatDateMock },
        { provide: TranslateService, useValue: translateServiceMock },
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
    it('should return nicely-formatted output', async () => {
      const pipe = new AutoreplyPipe(translateService, formatDateService, relativeDateService, sanitizer);
      const expected = '<span><span class="state STATE">state.STATE</span>&nbsp;' +
        '<span class="autoreply" title="MESSAGE"><span class="autoreply-content">autoreply</span></span>&nbsp</span>';
      const actual = await pipe.transform(TEST_TASK);
      assert.equal(actual, expected);
    });
  });

  describe('dayMonth', () => {
    it('should return nicely-formatted output', () => {
      const pipe = new DayMonthPipe(sanitizer);
      assert.equal(pipe.transform(TEST_DATE), '<span>2 Jan</span>');
    });
  });

  describe('fullDate', () => {
    it('should return nicely-formatted output', () => {
      relativeDateService.getRelativeDate.returns('0 days');
      const pipe = new FullDatePipe(sanitizer, formatDateService, relativeDateService);

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
      assert.equal(pipe.transform(TEST_DATE), '2046-01-02');
    });
  });

  describe('simpleDateTime', () => {
    it('should return nicely-formatted output', () => {
      const pipe = new SimpleDateTimePipe(formatDateService);
      assert.equal(pipe.transform(TEST_DATE), '2046-01-02T02:14:45.558Z');
    });
  });

  describe('state', () => {
    it('should return nicely-formatted output', async () => {
      const pipe = new StatePipe(translateService, formatDateService, relativeDateService, sanitizer);
      const expected = '<span><span class="state STATE">state.STATE</span>&nbsp;</span>';
      const actual = await pipe.transform(TEST_TASK);
      assert.equal(actual, expected);
    });
  });

  describe('weeksPregnant', () => {
    const pipe = new WeeksPregnantPipe();
    it('adds class for full term', () => {
      const weeks = { number: 37 };
      const expected = '<span class="weeks-pregnant upcoming-edd">37</span>';
      assert.equal(pipe.transform(weeks), expected);
    });


    it('adds class for approximate dates', () => {
      const weeks = { number: 37, approximate: true };
      const expected = '<span class="weeks-pregnant upcoming-edd approximate">37</span>';
      assert.equal(pipe.transform(weeks), expected);
    });
  });
});

