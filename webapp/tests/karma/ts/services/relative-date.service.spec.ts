import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as moment from 'moment';

import { FormatDateService } from '@mm-services/format-date.service';
import { RelativeDateService } from '@mm-services/relative-date.service';

describe('RelativeDate Service', () => {
  let service;
  let clock;
  let formatDateRelativeDay;
  let formatDateRelativeTime;
  let formatDateAge;
  let formatDateTime;

  beforeEach(() => {
    formatDateRelativeDay = sinon.stub().returns('somerelativeday');
    formatDateRelativeTime = sinon.stub().returns('somerelativetime');
    formatDateAge = sinon.stub().returns('someage');
    formatDateTime = sinon.stub().returns('someabsolutetime');
    const relative = (timestamp, options) => options.withoutTime ?
      formatDateRelativeDay(timestamp, options) : formatDateRelativeTime(timestamp, options);

    clock = sinon.useFakeTimers(5000);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: FormatDateService,
          useValue: {
            relative,
            age: formatDateAge,
            time: formatDateTime,
          },
        },
      ],
    });
    service = TestBed.inject(RelativeDateService);
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
    document
      .querySelectorAll('.update-relative-date')
      .forEach(element => element.remove());
  });


  describe('getCssSelector', () => {
    it('returns correct CSS selector', () => {
      const actual = service.getCssSelector();
      expect(actual).to.equal('update-relative-date');
    });
  });

  describe('generateDataset', () => {
    it('generates correct dataset', () => {
      const options = {
        RelativeDate: service,
        FormatDate: { someObject: 'somevalue' },
        prefix: 'prefix',
        suffix: 'suffix',
        camelCase: 123456,
        text: 'string',
        undef: undefined,
        isFalse: false,
        isNull: null,
        obj: { someProperty: 'somevalue' }
      };

      const given = 2398472085558;
      const actual = service.generateDataset(given, options);
      expect(actual)
        .to.equal(`data-date-options='{"date":${given.valueOf()},"camelCase":123456,"text":"string"}'`);
    });
  });

  describe('updateRelativeDates', () => {

    it('does nothing with no elements are present', () => {
      service.updateRelativeDates();
      expect(formatDateRelativeTime.callCount).to.equal(0);
      expect(formatDateAge.callCount).to.equal(0);
    });

    it('does not update relative date when no date is present, date is undefined or incorrect', () => {
      const spanNoData = document.createElement('span');
      spanNoData.appendChild(document.createTextNode('sometext'));
      spanNoData.setAttribute('id', 'spanNoData');
      spanNoData.className += 'update-relative-date';
      document.body.appendChild(spanNoData);

      const spanEmptyData = document.createElement('span');
      spanEmptyData.appendChild(document.createTextNode('sometext'));
      spanEmptyData.setAttribute('id', 'spanEmptyData');
      spanEmptyData.setAttribute('data-date-options', '');
      spanEmptyData.className += 'update-relative-date';
      document.body.appendChild(spanEmptyData);

      const spanBadData = document.createElement('span');
      spanBadData.appendChild(document.createTextNode('sometext'));
      spanBadData.setAttribute('id', 'spanBadData');
      spanBadData.setAttribute('data-date-options', 'alpha');
      spanBadData.className += 'update-relative-date';
      document.body.appendChild(spanBadData);

      const spanBadDate = document.createElement('span');
      spanBadDate.appendChild(document.createTextNode('sometext'));
      spanBadDate.setAttribute('id', 'spanBadDate');
      spanBadDate.setAttribute('data-date-options', '{"date":"something"}');
      spanBadDate.className += 'update-relative-date';
      document.body.appendChild(spanBadDate);

      service.updateRelativeDates();

      expect(document.getElementById('spanNoData')!.innerHTML).to.equal('sometext');
      expect(document.getElementById('spanEmptyData')!.innerHTML).to.equal('sometext');
      expect(document.getElementById('spanBadData')!.innerHTML).to.equal('sometext');
      expect(document.getElementById('spanBadDate')!.innerHTML).to.equal('sometext');

      expect(formatDateRelativeTime.callCount).to.equal(0);
      expect(formatDateAge.callCount).to.equal(0);
    });

    it('processes age option correctly', () => {
      const spanAge = document.createElement('span');
      spanAge.appendChild(document.createTextNode('sometext'));
      spanAge.setAttribute('id', 'spanAge');
      spanAge.setAttribute('data-date-options', JSON.stringify({date: 123456789, age: true}));
      spanAge.className += 'update-relative-date';
      document.body.appendChild(spanAge);

      const spanNoAge = document.createElement('span');
      spanNoAge.appendChild(document.createTextNode('sometext'));
      spanNoAge.setAttribute('id', 'spanNoAge');
      spanNoAge.setAttribute('data-date-options', JSON.stringify({date: 123456789}));
      spanNoAge.className += 'update-relative-date';
      document.body.appendChild(spanNoAge);

      service.updateRelativeDates();

      expect(document.getElementById('spanAge')!.innerHTML).to.equal('someage');
      expect(document.getElementById('spanNoAge')!.innerHTML).to.equal('somerelativetime');

      expect(formatDateRelativeTime.callCount).to.equal(1);
      expect(formatDateAge.callCount).to.equal(1);
    });

    it('processes withoutTime option correctly', () => {
      const spanWithoutTime = document.createElement('span');
      spanWithoutTime.setAttribute('id', 'spanWithoutTime');
      spanWithoutTime.setAttribute('data-date-options', JSON.stringify({date: 123456789, withoutTime: true}));
      spanWithoutTime.className += 'update-relative-date';
      document.body.appendChild(spanWithoutTime);

      const spanNoWithoutTime = document.createElement('span');
      spanNoWithoutTime.setAttribute('id', 'spanNoWithoutTime');
      spanNoWithoutTime.setAttribute('data-date-options', JSON.stringify({date: 123456789}));
      spanNoWithoutTime.className += 'update-relative-date';
      document.body.appendChild(spanNoWithoutTime);

      service.updateRelativeDates();
      expect(document.getElementById('spanWithoutTime')!.innerHTML).to.equal('somerelativeday');
      expect(document.getElementById('spanNoWithoutTime')!.innerHTML).to.equal('somerelativetime');

      expect(formatDateRelativeTime.callCount).to.equal(1);
      expect(formatDateRelativeDay.callCount).to.equal(1);
    });

    it('processes absoluteToday option correctly', () => {
      const timeToday = new Date().valueOf();
      const timeSomeOtherDay = 123456789;

      const spanTodayNoAbsolute = document.createElement('span');
      spanTodayNoAbsolute.setAttribute('id', 'spanTodayNoAbsolute');
      spanTodayNoAbsolute.setAttribute('data-date-options', JSON.stringify({date: timeToday}));
      spanTodayNoAbsolute.className += 'update-relative-date';
      document.body.appendChild(spanTodayNoAbsolute);

      const spanTodayAbsolute = document.createElement('span');
      spanTodayAbsolute.setAttribute('id', 'spanTodayAbsolute');
      spanTodayAbsolute.setAttribute('data-date-options', JSON.stringify({date: timeToday, absoluteToday: true}));
      spanTodayAbsolute.className += 'update-relative-date';
      document.body.appendChild(spanTodayAbsolute);

      const spanOtherDayNoAbsolute = document.createElement('span');
      spanOtherDayNoAbsolute.setAttribute('id', 'spanOtherDayNoAbsolute');
      spanOtherDayNoAbsolute.setAttribute('data-date-options', JSON.stringify({date: timeSomeOtherDay}));
      spanOtherDayNoAbsolute.className += 'update-relative-date';
      document.body.appendChild(spanOtherDayNoAbsolute);

      const spanOtherDayAbsolute = document.createElement('span');
      spanOtherDayAbsolute.setAttribute('id', 'spanOtherDayAbsolute');
      spanOtherDayAbsolute
        .setAttribute('data-date-options', JSON.stringify({date: timeSomeOtherDay, absoluteToday: true}));
      spanOtherDayAbsolute.className += 'update-relative-date';
      document.body.appendChild(spanOtherDayAbsolute);

      const spanTodayAbsoluteWitoutTime = document.createElement('span');
      spanTodayAbsoluteWitoutTime.setAttribute('id', 'spanTodayAbsoluteWitoutTime');
      spanTodayAbsoluteWitoutTime
        .setAttribute('data-date-options', JSON.stringify({date: timeToday, absoluteToday: true, withoutTime: true}));
      spanTodayAbsoluteWitoutTime.className += 'update-relative-date';
      document.body.appendChild(spanTodayAbsoluteWitoutTime);

      service.updateRelativeDates();
      expect(document.getElementById('spanTodayNoAbsolute')!.innerHTML).to.equal('somerelativetime');
      expect(document.getElementById('spanTodayAbsolute')!.innerHTML).to.equal('someabsolutetime');
      expect(document.getElementById('spanOtherDayNoAbsolute')!.innerHTML).to.equal('somerelativetime');
      expect(document.getElementById('spanOtherDayAbsolute')!.innerHTML).to.equal('somerelativetime');
      expect(document.getElementById('spanTodayAbsoluteWitoutTime')!.innerHTML).to.equal('somerelativeday');

      expect(formatDateRelativeTime.callCount).to.equal(3);
      expect(formatDateTime.callCount).to.equal(1);
      expect(formatDateRelativeDay.callCount).to.equal(1);
    });

  });

  describe('getRelativeDate', () => {

    it('calls through to age format', () => {
      formatDateAge.returns('15 days');
      const timestamp = 100;
      const options = { age: true };
      const actual = service.getRelativeDate(timestamp, options);
      expect(actual).to.equal('15 days');
      expect(formatDateAge.callCount).to.equal(1);
      expect(formatDateAge.args[0][0]).to.equal(timestamp);
    });

    it('calls through to time format', () => {
      formatDateTime.returns('12.53');
      const timestamp = 5100;
      const options = {
        absoluteToday: true
      };
      const actual = service.getRelativeDate(timestamp, options);
      expect(actual).to.equal('12.53');
      expect(formatDateTime.callCount).to.equal(1);
      expect(formatDateTime.args[0][0]).to.equal(timestamp);
    });

    it('calls through to relative format if withoutTime', () => {
      formatDateRelativeDay.returns('15 Jan');
      const timestamp = 5100;
      const options = {
        absoluteToday: true,
        withoutTime: true
      };
      const actual = service.getRelativeDate(timestamp, options);
      expect(actual).to.equal('15 Jan');
      expect(formatDateRelativeDay.callCount).to.equal(1);
      expect(formatDateRelativeDay.args[0][0]).to.equal(timestamp);
    });

    it('calls through to relative format if date not today', () => {
      formatDateRelativeTime.returns('12.53');
      const timestamp = moment().add(2, 'days');
      const options = {
        absoluteToday: true
      };
      const actual = service.getRelativeDate(timestamp, options);
      expect(actual).to.equal('12.53');
      expect(formatDateRelativeTime.callCount).to.equal(1);
      expect(formatDateRelativeTime.args[0][0]).to.equal(timestamp);
    });

    it('calls through to relative format if default options', () => {
      formatDateRelativeTime.returns('12.53');
      const timestamp = 5100;
      const options = {};
      const actual = service.getRelativeDate(timestamp, options);
      expect(actual).to.equal('12.53');
      expect(formatDateRelativeTime.callCount).to.equal(1);
      expect(formatDateRelativeTime.args[0][0]).to.equal(timestamp);
    });

  });
});
