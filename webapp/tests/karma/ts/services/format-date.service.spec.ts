import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as moment from 'moment';
import * as BikramSambat from 'bikram-sambat';
import { TranslateService } from '@ngx-translate/core';

import { FormatDateService } from '@mm-services/format-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { LanguageService } from '@mm-services/language.service';


describe('FormatDate service', () => {
  let service:FormatDateService;
  let translateInstant;
  let relativeTime;
  let pastFuture;
  let settingsService;
  let longDateFormat;
  let languageService;

  const TIME_FORMAT = 'h:mm A';
  const LONG_TIME_FORMAT = 'hh:mm:ss A';
  const DATETIME_FORMAT = 'DD-MMM-YYYY HH:mm:ss';
  const DATE_FORMAT = 'DD-MMM-YYYY';
  const DAY_MONTH = 'D MMM';

  beforeEach(() => {
    relativeTime = sinon.stub();
    pastFuture = sinon.stub();
    translateInstant = sinon.stub();
    settingsService = { get: sinon.stub() };
    languageService = { useDevanagariScript: sinon.stub() };

    longDateFormat = sinon.stub();
    longDateFormat.withArgs(sinon.match.same('LTS')).returns(LONG_TIME_FORMAT);
    longDateFormat.withArgs(sinon.match.same('LT')).returns(TIME_FORMAT);

    // @ts-ignore
    sinon.stub(moment, 'localeData').returns({
      relativeTime,
      pastFuture,
      longDateFormat,
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: TranslateService, useValue: { instant: translateInstant } },
        { provide: LanguageService, useValue: languageService },
      ]
    });

    service = TestBed.inject(FormatDateService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should init config on construct', () => {
    expect(longDateFormat.callCount).to.equal(2);
    expect(longDateFormat.args).to.deep.equal([['LT'], ['LTS']]);
  });

  describe('init', () => {
    beforeEach(() => {
      sinon.resetHistory();
    });

    it('should load settings and initialize config', async () => {
      settingsService.get.resolves({ date_format: 'Y-M-D' });
      await service.init();

      expect(settingsService.get.callCount).to.equal(1);
      expect(longDateFormat.callCount).to.equal(2);
      expect(longDateFormat.args).to.deep.equal([['LT'], ['LTS']]);

      const now = moment();
      expect(service.date(now)).to.equal(now.format('Y-M-D'));
    });

    it('should update moment config on init', async () => {
      settingsService.get.resolves({});
      longDateFormat.withArgs('LT').returns('ss mm HH');
      await service.init();

      const now = moment();
      expect(service.time(now)).to.equal(now.format('ss mm HH'));
    });

    it('should catch settings loading errors', async () => {
      settingsService.get.rejects({ some: 'error' });
      await service.init();

      expect(settingsService.get.callCount).to.equal(1);

      const now = moment();
      expect(service.date(now)).to.equal(now.format('DD-MMM-YYYY'));
    });
  });

  describe('age', () => {

    it('returns diff without suffix', () => {
      relativeTime.returns('5 years old');
      const actual = service.age(moment().subtract(5, 'years'));
      expect(actual).to.equal('5 years old');
      expect(relativeTime.args[0]).to.deep.equal([5, true, 'yy', false]);
    });

    it('rounds down', () => {
      relativeTime.returns('5 years old');
      const dob = moment().subtract(5, 'years').subtract(11, 'months').subtract(25, 'days');
      const actual = service.age(dob);
      expect(actual).to.equal('5 years old');
      expect(relativeTime.args[0]).to.deep.equal([5, true, 'yy', false]);
    });

    it('shows months when less than 2 years old', () => {
      relativeTime.returns('16 months');
      const dob = moment().subtract(16, 'months').subtract(25, 'days');
      const actual = service.age(dob);
      expect(actual).to.equal('16 months');
      expect(relativeTime.args[0]).to.deep.equal([16, true, 'MM', false]);
    });

    it('shows days when less than 2 months old', () => {
      relativeTime.returns('50 days');
      const dob = moment().subtract(50, 'days');
      const actual = service.age(dob);
      expect(actual).to.equal('50 days');
      expect(relativeTime.args[0]).to.deep.equal([50, true, 'dd', false]);
    });

    it('shows singular when one day old', () => {
      relativeTime.returns('1 day');
      const dob = moment().subtract(1, 'days');
      const actual = service.age(dob);
      expect(actual).to.equal('1 day');
      expect(relativeTime.args[0]).to.deep.equal([1, true, 'd', false]);
    });

    it('shows zero days old when just born', () => {
      relativeTime.returns('0 days');
      const dob = moment();
      const actual = service.age(dob);
      expect(actual).to.equal('0 days');
      expect(relativeTime.args[0]).to.deep.equal([0, true, 'dd', false]);
    });

    it('calculates age at death if known', () => {
      relativeTime.returns('100 years');
      const dob = moment().subtract(120, 'years');
      const dod = moment().subtract(20, 'years');
      const actual = service.age(dob, { end: dod });
      expect(actual).to.equal('100 years');
      expect(relativeTime.args[0]).to.deep.equal([100, true, 'yy', false]);
    });

  });

  describe('relative without time', () => {

    it('returns "today" when between now and tomorrow', () => {
      translateInstant.returns('pretty soon');
      const actual = service.relative(moment(), { withoutTime: true });
      expect(actual).to.equal('pretty soon');
      expect(translateInstant.args[0]).to.deep.equal(['today', undefined]);
    });

    it('returns "today" when between midnight and now', () => {
      translateInstant.returns('pretty soon');
      const actual = service.relative(moment().startOf('day'), { withoutTime: true });
      expect(actual).to.equal('pretty soon');
      expect(translateInstant.args[0]).to.deep.equal(['today', undefined]);
    });

    /**
     * It doesn't matter how many hours away something is, if we cross
     * two day boundaries then we call that 'in 2 days'.
     * https://github.com/medic/medic/issues/1757
     */
    it('returns "in 2 days" when two sleeps away', () => {
      relativeTime.returns('2 days');
      pastFuture.returns('in 2 days');
      const date = moment().add(2, 'days').startOf('day').add(1, 'hours');
      const actual = service.relative(date, { withoutTime: true });
      expect(actual).to.equal('in 2 days');
      expect(relativeTime.args[0]).to.deep.equal([2, true, 'dd', true]);
      expect(pastFuture.args[0]).to.deep.equal([2, '2 days']);
    });

    it('returns "2 days ago" when two sleeps have passed', () => {
      relativeTime.returns('2 days');
      pastFuture.returns('2 days ago');
      const date = moment().subtract(2, 'days').startOf('day').add(1, 'hours');
      const actual = service.relative(date, { withoutTime: true });
      expect(actual).to.equal('2 days ago');
      expect(relativeTime.args[0]).to.deep.equal([2, true, 'dd', false]);
      expect(pastFuture.args[0]).to.deep.equal([-2, '2 days']);
    });

    it('returns "yesterday" when 1 day ago', () => {
      translateInstant.returns('yesterday');
      const actual = service.relative(moment().subtract(1, 'days'), { withoutTime: true });
      expect(actual).to.equal('yesterday');
      expect(translateInstant.args[0]).to.deep.equal(['yesterday', undefined]);
    });

    it('returns "tomorrow" when in 1 day', () => {
      translateInstant.returns('tomorrow');
      const actual = service.relative(moment().add(1, 'days'), { withoutTime: true });
      expect(actual).to.equal('tomorrow');
      expect(translateInstant.args[0]).to.deep.equal(['tomorrow', undefined]);
    });

  });

  describe('relative with time', () => {

    it('falls through to moment fromNow', () => {
      const actual = service.relative(moment().add(5, 'hours'));
      expect(actual).to.equal('in 5 hours');
    });
  });

  describe('time', () => {
    it('returns just the time of a given date', () => {
      const now = moment();
      const time = now.format(TIME_FORMAT);
      const actual = service.time(now);
      expect(actual).to.equal(time);
      expect(languageService.useDevanagariScript.callCount).to.equal(1);
    });

    it('should return the time when language is Nepali and using useBikramSambat dates', () => {
      languageService.useDevanagariScript.returns(true);

      const now = moment();
      const time = now.format(TIME_FORMAT);
      const actual = service.time(now);
      expect(actual).to.equal(time);
    });
  });

  describe('datetime', () => {
    it('should return formatted datetime', () => {
      const now = moment();
      const formatted = now.format(DATETIME_FORMAT);
      expect(service.datetime(now)).to.equal(formatted);
    });

    it('should return formatted datetime depending on settings', async () => {
      const newFormat = 'D-M-Y';
      settingsService.get.resolves({ reported_date_format: newFormat });
      await service.init();

      const now = moment();
      const formatted = now.format(newFormat);
      expect(service.datetime(now)).to.equal(formatted);
    });

    it('should return bikram sambat date when language is nepali', () => {
      languageService.useDevanagariScript.returns(true);
      sinon.stub(BikramSambat, 'toBik_text').returns('bk date');

      const now = moment();
      const time = now.format('hh:mm:ss A');
      expect(service.datetime(now)).to.equal('bk date, ' + time);
      expect(BikramSambat.toBik_text.callCount).to.equal(1);
      expect(BikramSambat.toBik_text.args[0]).to.deep.equal([now]);
    });
  });

  describe('date', () => {
    it('should return formatted date', () => {
      const now = moment();
      const formatted = now.format(DATE_FORMAT);
      expect(service.date(now)).to.equal(formatted);
    });

    it('should return formatted date depending on settings', async () => {
      const newFormat = 'D-M-Y';
      settingsService.get.resolves({ date_format: newFormat });
      await service.init();

      const now = moment();
      const formatted = now.format(newFormat);
      expect(service.date(now)).to.equal(formatted);
    });

    it('should return bikram sambat date when language is nepali', () => {
      languageService.useDevanagariScript.returns(true);
      sinon.stub(BikramSambat, 'toBik_text').returns('bk converted date');

      const now = moment();
      expect(service.date(now)).to.equal('bk converted date');
      expect(BikramSambat.toBik_text.callCount).to.equal(1);
      expect(BikramSambat.toBik_text.args[0]).to.deep.equal([now]);
    });
  });

  describe('dayMonth', () => {
    it('should return formatted day month', () => {
      const now = moment();
      const formatted = now.format(DAY_MONTH);
      expect(service.dayMonth(now)).to.equal(formatted);
    });

    it('should return bikram sambat day month when language is nepali', () => {
      languageService.useDevanagariScript.returns(true);
      sinon.stub(BikramSambat, 'toBik').returns({ year: 'bkyear', month: 'bkmonth', day: 'bkday' });
      sinon.stub(BikramSambat, 'toDev').returns({ year: 'devyear', month: 'devmonth', day: 'devday' });

      const now = moment();
      expect(service.dayMonth(now)).to.equal('devday devmonth');
      expect(BikramSambat.toBik.callCount).to.equal(1);
      expect(BikramSambat.toBik.args[0]).to.deep.equal([now]);
      expect(BikramSambat.toDev.callCount).to.equal(1);
      expect(BikramSambat.toDev.args[0]).to.deep.equal(['bkyear', 'bkmonth', 'bkday']);
    });
  });

  describe('task due date', () => {

    it('returns "due" when due yesterday', () => {
      translateInstant.returns('due');
      const actual = service.relative(moment().subtract(1, 'days'), { task: true });
      expect(actual).to.equal('due');
      expect(translateInstant.callCount).to.equal(1);
      expect(translateInstant.args[0]).to.deep.equal(['task.overdue', undefined]);
    });

    it('returns "due" when due today', async () => {
      translateInstant.returns('due');
      const actual = service.relative(moment(), { task: true });
      expect(actual).to.equal('due');
      expect(translateInstant.args[0]).to.deep.equal(['task.overdue', undefined]);

      settingsService.get.resolves({ task_days_overdue: true });
      await service.init();

      expect(service.relative(moment(), { task: true })).to.equal('due');
      expect(translateInstant.args[1]).to.deep.equal(['task.overdue.days', { DAYS: 0 }]);

      expect(translateInstant.callCount).to.equal(2);
    });

    it('returns "1 day left" when in 1 day', async () => {
      translateInstant.returns('1 day left');
      const actual = service.relative(moment().add(1, 'days'), { task: true });
      expect(actual).to.equal('1 day left');
      expect(translateInstant.args[0]).to.deep.equal(['task.days.left', { DAYS: 1 }]);

      settingsService.get.resolves({ task_days_overdue: true });
      await service.init();
      expect(service.relative(moment().add(1, 'days'), { task: true })).to.equal('1 day left');
      expect(translateInstant.args[1]).to.deep.equal(['task.days.left', { DAYS: 1 }]);
    });

    it('returns empty string when due in 5 days', async () => {
      const actual = service.relative(moment().add(5, 'days'), { task: true });
      expect(actual).to.equal('');
      expect(translateInstant.callCount).to.equal(0);

      settingsService.get.resolves({ task_days_overdue: true });
      await service.init();

      expect(service.relative(moment().add(5, 'days'), { task: true })).to.equal('');
      expect(translateInstant.callCount).to.equal(0);
    });

    it('should return "5 days left" when task_day_limit is increased', async () => {
      settingsService.get.resolves({ task_day_limit: 7 });
      const inFiveDays = moment().add(5, 'days');
      translateInstant.returns('5 days left');

      await service.init();
      expect(service.relative(inFiveDays, { task: true })).to.equal('5 days left');
      expect(translateInstant.callCount).to.equal(1);
      expect(translateInstant.args[0]).to.deep.equal(['task.days.left', { DAYS: 5 }]);

      settingsService.get.resolves({ task_day_limit: 7, task_days_overdue: true });

      await service.init();
      expect(service.relative(inFiveDays, { task: true })).to.equal('5 days left');
      expect(translateInstant.callCount).to.equal(2);
      expect(translateInstant.args[1]).to.deep.equal(['task.days.left', { DAYS: 5 }]);
    });

    it('should return "due" when due in the past by default', () => {
      translateInstant.returns('due');
      const actual = service.relative(moment().subtract(4, 'days'), { task: true });
      expect(actual).to.equal('due');
      expect(translateInstant.callCount).to.equal(1);
      expect(translateInstant.args[0]).to.deep.equal(['task.overdue', undefined]);
    });

    it('should return "due" when due in the past by when task_days_overdue is undefined', async () => {
      settingsService.get.resolves({ });
      translateInstant.returns('due');
      await service.init();

      const actual = service.relative(moment().subtract(4, 'days'), { task: true });
      expect(actual).to.equal('due');
      expect(translateInstant.callCount).to.equal(1);
      expect(translateInstant.args[0]).to.deep.equal(['task.overdue', undefined]);
    });

    it('should return "due" when due in the past by when task_days_overdue is false', async () => {
      settingsService.get.resolves({ task_days_overdue: false });
      translateInstant.returns('due');
      await service.init();

      const actual = service.relative(moment().subtract(4, 'days'), { task: true });
      expect(actual).to.equal('due');
      expect(translateInstant.callCount).to.equal(1);
      expect(translateInstant.args[0]).to.deep.equal(['task.overdue', undefined]);
    });

    it('should return days ago when due in the past by when task_days_overdue is true', async () => {
      settingsService.get.resolves({ task_days_overdue: true });
      translateInstant.returns('Due 4 days ago');
      await service.init();

      const actual = service.relative(moment().subtract(4, 'days'), { task: true });
      expect(actual).to.equal('Due 4 days ago');
      expect(translateInstant.callCount).to.equal(1);
      expect(translateInstant.args[0]).to.deep.equal(['task.overdue.days', { DAYS: 4 }]);
    });
  });
});
