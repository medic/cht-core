import { async, TestBed } from '@angular/core/testing';
import { assert, expect } from 'chai';
import sinon from 'sinon';
import * as moment from 'moment';
import { DomSanitizer } from '@angular/platform-browser';
import { Component, Input } from '@angular/core';
import { of } from 'rxjs';
import { AsyncPipe } from '@angular/common';

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


describe('date pipes', () => {
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

    TestBed
      .configureTestingModule({
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


describe('date pipes rendering', () => {
  @Component({ template: `` })
  class TestComponent {
    @Input() date;
    @Input() task;
  }

  let fixture;
  let relativeDate;
  let formatDate;
  let sanitizer;
  let translate;

  const override = async(template, { task=undefined, date=undefined }={}) => {
    TestBed.overrideTemplate(TestComponent, template);
    fixture = TestBed.createComponent(TestComponent);
    fixture.componentInstance.date = date;
    fixture.componentInstance.task = task;
    fixture.detectChanges();
    await fixture.whenRenderingDone();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    relativeDate = {
      getRelativeDate: sinon.stub().returns('somerelativetime'),
      getCssSelector: () => 'update-relative-date',
      generateDataset: () => 'data-date-options="someOptions"'
    };
    formatDate = {
      age: momentDate => `${momentDate.year() - 1970} years`,
      time: sinon.stub().returns('sometime'),
      date: sinon.stub().callsFake(d => `${d.toISOString().split('T')[0]}`),
      datetime: sinon.stub().returns('day 0'),
      relative: sinon.stub().returns('somerelativetime'),
    };
    translate = {
      instant: sinon.stub().returnsArg(0),
      get: sinon.stub().callsFake(arg => of([arg])),
    };
    sanitizer = { bypassSecurityTrustHtml: sinon.stub().returnsArg(0) };

    TestBed
      .configureTestingModule({
        providers: [
          { provide: RelativeDateService, useValue: relativeDate },
          { provide: FormatDateService, useValue: formatDate },
          { provide: TranslateService, useValue: translate },
          { provide: DomSanitizer, useValue: sanitizer },
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
          TestComponent,
          AsyncPipe,
        ]
      })
      .compileComponents();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('fullDate', () => {
    it('should render nothing when no date', async () => {
      await override(`<div [innerHTML]="date | fullDate"></div>`);
      expect(fixture.nativeElement.querySelector('div').innerHTML).to.equal('');
    });

    it('should render date', async () => {
      await override(`<div [innerHTML]="date | fullDate"></div>`, { date: moment().valueOf() });
      expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('somerelativetime');
      expect(fixture.nativeElement.querySelector('.full-date').innerText).to.equal('day 0');
    });
  });

  describe('relativeDate', () => {
    it('should render nothing when no date', async () => {
      await override(`<div [innerHTML]="date | relativeDate"></div>`);
      expect(fixture.nativeElement.querySelector('div').innerHTML).to.equal('<span></span>');
    });

    it('should render date', async () => {
      const date = moment('2017-10-10T10:10:10.100').valueOf();
      await override(`<div [innerHTML]="date | relativeDate"></div>`, { date });
      expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('class'))
        .to.equal('relative-date past');
      expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('title')).to.equal('day 0');
      expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('somerelativetime');
    });

    it('should render a time when the date is today', async () => {
      const date = moment().valueOf();
      await override(`<div [innerHTML]="date | relativeDate"></div>`, { date });
      expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('title')).to.equal('day 0');
      expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('somerelativetime');
    });

    it('should render a date in the future', async () => {
      const date = moment().add(2, 'days').valueOf();
      await override(`<div [innerHTML]="date | relativeDate"></div>`, { date });
      expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('class'))
        .to.equal('relative-date future');
      expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('somerelativetime');
    });
  });

  describe('relativeDay', () => {
    it('should render nothing when no date', async () => {
      await override(`<div [innerHTML]="date | relativeDay"></div>`);
      expect(fixture.nativeElement.querySelector('div').innerHTML).to.equal('<span></span>');
    });

    it('should render date', async () => {
      formatDate.date.returns('1st Jan 2020');
      relativeDate.getRelativeDate.returns('in 5 days');
      const date = moment().add(5, 'days').valueOf();
      await override(`<div [innerHTML]="date | relativeDay"></div>`, { date });

      expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('title')).to.equal('1st Jan 2020');
      expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('in 5 days');
    });

    it('should render "today"', async () => {
      formatDate.date.returns('1st Jan 2020');
      relativeDate.getRelativeDate.returns('today');
      const date = moment().valueOf();
      await override(`<div [innerHTML]="date | relativeDay"></div>`, { date });

      expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('title')).to.equal('1st Jan 2020');
      expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('today');
    });
  });

  describe('state', () => {
    beforeEach(() => {
      relativeDate.getRelativeDate.callsFake(date => 'relative: ' + date.valueOf());
      formatDate.datetime.callsFake(date => 'datetime: ' + date.valueOf());
    });

    describe('renders state', () => {

      it('when no task', async () => {
        const task = {};
        const expected = 'reçu';
        translate.get.withArgs('state.received').returns(of(expected));
        await override(`<div class="task-state" [innerHTML]="task | state | async"></div>`, { task });

        expect(fixture.nativeElement.querySelector('.state').innerText).to.equal(expected);
      });

      it('when task', async(async () => {
        const task = {
          state: 'pending'
        };
        const expected = 'en attente';
        translate.get.withArgs('state.pending').returns(of([expected]));
        await override(`<div class="task-state" [innerHTML]="task | state | async "></div>`, { task });

        expect(fixture.nativeElement.querySelector('.state').innerText).to.equal(expected);
      }));

    });

    describe('renders dates', () => {

      it('when no state history', async () => {
        const task = {
          state: 'unknown',
          due: 1
        };
        await override(`<div class="task-state" [innerHTML]="task | state | async "></div>`, { task });

        expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('title')).to.equal('datetime: 1');
        expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('relative: 1');
      });

      it('when scheduled', async () => {
        const task = {
          state: 'scheduled',
          due: 1
        };

        await override(`<div class="task-state" [innerHTML]="task | state | async"></div>`, { task });
        expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('title')).to.equal('datetime: 1');
        expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('relative: 1');
      });

      it('when scheduled with history', async () => {
        const task = {
          state: 'scheduled',
          state_history: [ { state: 'scheduled', timestamp: 2 } ],
          due: 1
        };

        await override(`<div class="task-state" [innerHTML]="task | state | async "></div>`, { task });
        expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('title')).to.equal('datetime: 1');
        expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('relative: 1');
      });

      it('when state history', async () => {
        const task = {
          state: 'unknown',
          state_history: [ { timestamp: 2 } ],
          due: 1
        };

        await override(`<div class="task-state" [innerHTML]="task | state | async "></div>`, { task });
        expect(fixture.nativeElement.querySelector('.relative-date').getAttribute('title')).to.equal('datetime: 2');
        expect(fixture.nativeElement.querySelector('.relative-date-content').innerText).to.equal('relative: 2');
      });
    });

    describe('renders recipients', () => {

      it('when to', async () => {
        const task = {
          state: 'scheduled',
          due: 1,
          messages: [ { to: '+64123555555' } ]
        };
        const expected = 'au +64123555555';
        translate.get.withArgs('to recipient', { recipient: '+64123555555' }).returns(of([expected]));
        await override(`<div class="task-state" [innerHTML]="task | state | async "></div>`, { task });
        const nonbreakingSpace = ' '; // this is not a space character...
        expect(fixture.nativeElement.querySelector('.recipient').innerText).to.equal(nonbreakingSpace + expected);
      });

    });
  });
});
