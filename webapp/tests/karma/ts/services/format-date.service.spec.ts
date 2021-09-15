import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as moment from 'moment';

import { FormatDateService } from '@mm-services/format-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { TranslateService } from '@ngx-translate/core';


describe('FormatDate service', () => {
  let service:FormatDateService;
  let translateInstant;
  let relativeTime;
  let pastFuture;
  let settingsService;

  const LONG_DATE_FORMAT = 'h:mm A';
  const DATETIME_FORMAT = 'DD-MMM-YYYY HH:mm:ss';

  beforeEach(() => {
    relativeTime = sinon.stub();
    pastFuture = sinon.stub();
    translateInstant = sinon.stub();
    settingsService = { get: sinon.stub() };
    // @ts-ignore
    sinon.stub(moment, 'localeData').returns({
      relativeTime,
      pastFuture,
      longDateFormat: () => LONG_DATE_FORMAT,
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: TranslateService, useValue: { instant: translateInstant } },
      ]
    });

    service = TestBed.inject(FormatDateService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('init', () => {
    it('should load settings', async () => {
      settingsService.get.resolves({ date_format: 'Y-M-D' });
      await service.init();

      expect(settingsService.get.callCount).to.equal(1);

      const now = moment();
      expect(service.date(now)).to.equal(now.format('Y-M-D'));
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
      expect(relativeTime.args[0][0]).to.equal(5);     // quantity
      expect(relativeTime.args[0][1]).to.equal(true);  // without suffix
      expect(relativeTime.args[0][2]).to.equal('yy');  // translation key for "years"
    });

    it('rounds down', () => {
      relativeTime.returns('5 years old');
      const dob = moment().subtract(5, 'years').subtract(11, 'months').subtract(25, 'days');
      const actual = service.age(dob);
      expect(actual).to.equal('5 years old');
      expect(relativeTime.args[0][0]).to.equal(5);
      expect(relativeTime.args[0][1]).to.equal(true);
      expect(relativeTime.args[0][2]).to.equal('yy');
    });

    it('shows months when less than 2 years old', () => {
      relativeTime.returns('16 months');
      const dob = moment().subtract(16, 'months').subtract(25, 'days');
      const actual = service.age(dob);
      expect(actual).to.equal('16 months');
      expect(relativeTime.args[0][0]).to.equal(16);
      expect(relativeTime.args[0][1]).to.equal(true);
      expect(relativeTime.args[0][2]).to.equal('MM');
    });

    it('shows days when less than 2 months old', () => {
      relativeTime.returns('50 days');
      const dob = moment().subtract(50, 'days');
      const actual = service.age(dob);
      expect(actual).to.equal('50 days');
      expect(relativeTime.args[0][0]).to.equal(50);
      expect(relativeTime.args[0][1]).to.equal(true);
      expect(relativeTime.args[0][2]).to.equal('dd');
    });

    it('shows singular when one day old', () => {
      relativeTime.returns('1 day');
      const dob = moment().subtract(1, 'days');
      const actual = service.age(dob);
      expect(actual).to.equal('1 day');
      expect(relativeTime.args[0][0]).to.equal(1);
      expect(relativeTime.args[0][1]).to.equal(true);
      expect(relativeTime.args[0][2]).to.equal('d');
    });

    it('shows zero days old when just born', () => {
      relativeTime.returns('0 days');
      const dob = moment();
      const actual = service.age(dob);
      expect(actual).to.equal('0 days');
      expect(relativeTime.args[0][0]).to.equal(0);
      expect(relativeTime.args[0][1]).to.equal(true);
      expect(relativeTime.args[0][2]).to.equal('dd');
    });

    it('calculates age at death if known', () => {
      relativeTime.returns('100 years');
      const dob = moment().subtract(120, 'years');
      const dod = moment().subtract(20, 'years');
      const actual = service.age(dob, { end: dod });
      expect(actual).to.equal('100 years');
      expect(relativeTime.args[0][0]).to.equal(100);
      expect(relativeTime.args[0][1]).to.equal(true);
      expect(relativeTime.args[0][2]).to.equal('yy');
    });

  });

  describe('relative without time', () => {

    it('returns "today" when between now and tomorrow', () => {
      translateInstant.returns('pretty soon');
      const actual = service.relative(moment(), { withoutTime: true });
      expect(actual).to.equal('pretty soon');
      expect(translateInstant.args[0][0]).to.equal('today');
    });

    it('returns "today" when between midnight and now', () => {
      translateInstant.returns('pretty soon');
      const actual = service.relative(moment().startOf('day'), { withoutTime: true });
      expect(actual).to.equal('pretty soon');
      expect(translateInstant.args[0][0]).to.equal('today');
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
      expect(relativeTime.args[0][0]).to.equal(2);
      expect(relativeTime.args[0][1]).to.equal(true);
      expect(relativeTime.args[0][2]).to.equal('dd');
      expect(pastFuture.args[0][0]).to.equal(2);
      expect(pastFuture.args[0][1]).to.equal('2 days');
    });

    it('returns "2 days ago" when two sleeps have passed', () => {
      relativeTime.returns('2 days');
      pastFuture.returns('2 days ago');
      const date = moment().subtract(2, 'days').startOf('day').add(1, 'hours');
      const actual = service.relative(date, { withoutTime: true });
      expect(actual).to.equal('2 days ago');
      expect(relativeTime.args[0][0]).to.equal(2);
      expect(relativeTime.args[0][1]).to.equal(true);
      expect(relativeTime.args[0][2]).to.equal('dd');
      expect(pastFuture.args[0][0]).to.equal(-2);
      expect(pastFuture.args[0][1]).to.equal('2 days');
    });

    it('returns "yesterday" when 1 day ago', () => {
      translateInstant.returns('yesterday');
      const actual = service.relative(moment().subtract(1, 'days'), { withoutTime: true });
      expect(actual).to.equal('yesterday');
      expect(translateInstant.args[0][0]).to.equal('yesterday');
    });

    it('returns "tomorrow" when in 1 day', () => {
      translateInstant.returns('tomorrow');
      const actual = service.relative(moment().add(1, 'days'), { withoutTime: true });
      expect(actual).to.equal('tomorrow');
      expect(translateInstant.args[0][0]).to.equal('tomorrow');
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
      const time = now.format(LONG_DATE_FORMAT);
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
      expect(translateInstant.args[1]).to.deep.equal(['task.overdue', undefined]);

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
