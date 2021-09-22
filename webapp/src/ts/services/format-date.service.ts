import * as moment from 'moment';
import { Injectable } from '@angular/core';
import { RelativeTimeKey } from 'moment';
import { toBik_text as toBikranSambatText } from 'bikram-sambat';

import { SettingsService } from '@mm-services/settings.service';
import { TranslateService } from '@mm-services/translate.service';
import { LanguageService } from '@mm-services/language.service';

@Injectable({
  providedIn: 'root',
})
export class FormatDateService {
  constructor(
    private translateService:TranslateService,
    private settingsService:SettingsService,
    private languageService:LanguageService,
  ) {
    this.initConfig();
  }

  private config;
  private initConfig() {
    this.config = {
      date: 'DD-MMM-YYYY',
      datetime: 'DD-MMM-YYYY HH:mm:ss',
      dayMonth: 'D MMM',
      time: moment.localeData().longDateFormat('LT'),
      longTime: moment.localeData().longDateFormat('LTS'),
      taskDayLimit: 4,
      taskDaysOverdue: false,
      useBikramSambat: true,
      ageBreaks: [
        { unit: 'years', key: { singular: 'y', plural: 'yy' }, min: 1 },
        { unit: 'months', key: { singular: 'M', plural: 'MM' }, min: 1 },
        { unit: 'days', key: { singular: 'd', plural: 'dd' }, min: 0 }
      ]
    };
  }


  init() {
    this.initConfig();
    return this.settingsService
      .get()
      .then((res:any) => {
        this.config.date = res.date_format;
        this.config.datetime = res.reported_date_format;
        if (typeof res.task_day_limit !== 'undefined') {
          this.config.taskDayLimit = res.task_day_limit;
        }
        if (typeof res.task_days_overdue !== 'undefined') {
          this.config.taskDaysOverdue = res.task_days_overdue;
        }
        if (typeof res.useBikramSambat !== 'undefined') {
          this.config.useBikramSambat = res.useBikramSambat;
        }
      })
      .catch((err) => {
        console.error('Error fetching settings', err);
      });
  }
  private displayBikramSambatDate(momentDate, key) {
    if (key === 'time') {
      return momentDate.format(this.config[key]);
    }

    const bkDateText = toBikranSambatText(momentDate);
    if (key === 'dayMonth') {
      // bikram-sambat library has no support to return "pieces" of the date
      const [day, month] = bkDateText.split(/\s/);
      return `${day} ${month}`;
    }

    if (key === 'date') {
      return bkDateText;
    }

    if (key === 'datetime') {
      // inspired from Nepali moment locale LLLL long date format: dddd, D MMMM YYYY, Aको h:mm बजे
      return `${bkDateText}, ${momentDate.format(this.config.longTime)}`;
    }
  }

  private format(date, key) {
    const momentDate = moment(date);
    const language = this.languageService.getSync();

    if (language === 'ne' && this.config.useBikramSambat) {
      return this.displayBikramSambatDate(momentDate, key);
    }

    return momentDate.format(this.config[key]);
  }

  private getDateDiff(date, options) {
    let end = options.end ? moment(options.end) : moment(); // default to now
    end = end.startOf('day'); // remove the time component
    for (let i = 0; i < this.config.ageBreaks.length; i++) {
      const ageBreak = this.config.ageBreaks[i];
      const diff = date.diff(end, ageBreak.unit);
      if (Math.abs(diff) > ageBreak.min) {
        return { quantity: diff, key: ageBreak.key };
      }
    }
    return { quantity: 0, key: { singular: 'd', plural: 'dd' } };
  }

  private getTaskDueDate(given) {
    const date = moment(given).startOf('day');
    const today = moment().startOf('day');
    const diff = date.diff(today, 'days');

    if (diff <= 0) {
      if (this.config.taskDaysOverdue) {
        return this.translateService.instant('task.overdue.days', { DAYS: Math.abs(diff) });
      }

      return this.translateService.instant('task.overdue');
    }

    if (diff <= this.config.taskDayLimit) {
      return this.translateService.instant('task.days.left', { DAYS: diff });
    }

    return '';
  }

  private relativeDate(date, options) {
    const diff = this.getDateDiff(moment(date).startOf('day'), options);
    if (options.humanize) {
      if (diff.quantity === 0) {
        return this.translateService.instant('today');
      }
      if (diff.quantity === 1) {
        return this.translateService.instant('tomorrow');
      }
      if (diff.quantity === -1) {
        return this.translateService.instant('yesterday');
      }
    }
    const quantity = Math.abs(diff.quantity);
    const key = quantity === 1 ? diff.key.singular : diff.key.plural;
    const output = moment.localeData().relativeTime(quantity, true, <RelativeTimeKey>key, diff.quantity > 0);
    if (options.suffix) {
      return moment.localeData().pastFuture(diff.quantity, output);
    }
    return output;
  }

  date(date) {
    return this.format(date, 'date');
  }

  datetime(date) {
    return this.format(date, 'datetime');
  }

  dayMonth(date) {
    return this.format(date, 'dayMonth');
  }

  relative(date, options:any = {}) {
    if (options.task) {
      return this.getTaskDueDate(date);
    }
    if (options.withoutTime) {
      return this.relativeDate(date, { suffix: true, humanize: true });
    }
    return moment(date).fromNow(false);
  }

  age(date, options:any = {}) {
    return this.relativeDate(date, options);
  }

  time(date) {
    return this.format(date, 'time');
  }
}
