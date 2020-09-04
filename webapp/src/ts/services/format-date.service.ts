import * as moment from 'moment';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from './settings.service';
import { RelativeTimeKey } from 'moment';

@Injectable({
  providedIn: 'root',
})
export class FormatDateService {
  constructor(
    private translateService:TranslateService,
    private settingsService:SettingsService,
  ) {
  }

  init() {
    this.settingsService.get()
      .then((res:any) => {
        this.config.date = res.date_format;
        this.config.datetime = res.reported_date_format;
        if (typeof res.task_day_limit !== 'undefined') {
          this.config.taskDayLimit = res.task_day_limit;
        }
      })
      .catch((err) => {
        console.error('Error fetching settings', err);
      });
  }

  private readonly config = {
    date: 'DD-MMM-YYYY',
    datetime: 'DD-MMM-YYYY HH:mm:ss',
    time: moment.localeData().longDateFormat('LT'),
    taskDayLimit: 4,
    ageBreaks: [
      { unit: 'years', key: { singular: 'y', plural: 'yy' }, min: 1 },
      { unit: 'months', key: { singular: 'M', plural: 'MM' }, min: 1 },
      { unit: 'days', key: { singular: 'd', plural: 'dd' }, min: 0 }
    ]
  }

  private format(date, key) {
    return moment(date).format(this.config[key]);
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
