import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import * as moment from 'moment';

import { FormatDateService } from '@mm-services/format-date.service';
import { RelativeDateService } from '@mm-services/relative-date.service';
import { TranslateService } from '@mm-services/translate.service';

const getState = (state, translateService) => {
  return translateService
    .get('state.' + state)
    .then(label => '<span class="state ' + state + '">' + label + '</span>');
};

const getRelativeDate = (date, options) => {
  options = Object.assign({ prefix: '', suffix: '', absoluteToday: true }, options);

  if (!date) {
    if (options.raw) {
      return;
    }
    return `<span>${options.prefix}${options.suffix}</span>`;
  }

  const momentDate = moment(date);
  const relative = options.RelativeDate.getRelativeDate(momentDate, options);

  if (options.raw) {
    return relative;
  }

  const classes = ['relative-date'];
  const absolute = getAbsoluteDateString(momentDate, options);

  let now = moment();

  if (options.withoutTime) {
    now = now.startOf('day');
  }

  if (momentDate.isBefore(now)) {
    classes.push('past');
  } else {
    classes.push('future');
  }

  if (options.age) {
    classes.push('age');
  }

  const relativeDateClass = options.RelativeDate.getCssSelector();
  const dataSet = options.RelativeDate.generateDataset(date, options);

  return `${options.prefix}<span class="${classes.join(' ')}" title="${absolute}">` +
    `<span class="relative-date-content ${relativeDateClass}" ${dataSet}>${relative}</span>` +
    `</span>${options.suffix}`;
};

const getAbsoluteDateString = (date, options) => {
  if (options.withoutTime) {
    return options.FormatDate.date(date);
  }
  return options.FormatDate.datetime(date);
};

const getTaskDate = (task) => {
  const current = task.state_history &&
    task.state_history.length &&
    task.state_history[task.state_history.length - 1];
  if (current) {
    if (current.state === 'scheduled') {
      return task.due;
    }
    return current.timestamp;
  }
  return task.due || task.reported_date;
};

const getRecipient = (task, translateService) => {
  const recipient = task && task.messages && task.messages.length && task.messages[0].to;
  if (!recipient) {
    return Promise.resolve('');
  }

  return translateService
    .get('to recipient', { recipient: recipient })
    .then(label => {
      return '<span class="recipient">&nbsp;' + label + '</span>';
    });
};

@Pipe({
  name: 'autoreply'
})
@Injectable({
  providedIn: 'root'
})
export class AutoreplyPipe implements PipeTransform {
  constructor(
    private translateService:TranslateService,
    private formatDateService:FormatDateService,
    private relativeDateService:RelativeDateService,
    private sanitizer: DomSanitizer,
  ) { }

  transform(task) {
    if (!task) {
      return Promise.resolve('');
    }

    return getState(task.state, this.translateService).then(state => {
      const content = state + '&nbsp;' +
        '<span class="autoreply" title="' + task.messages[0].message + '">' +
        '<span class="autoreply-content">' + this.translateService.instant('autoreply') + '</span>' +
        '</span>&nbsp';

      const transformedContent = getRelativeDate(getTaskDate(task), {
        FormatDate: this.formatDateService,
        RelativeDate: this.relativeDateService,
        prefix: content,
      });

      return this.sanitizer.bypassSecurityTrustHtml(transformedContent);
    });
  }
}

@Pipe({
  name: 'state'
})
@Injectable({
  providedIn: 'root'
})
export class StatePipe implements PipeTransform {
  constructor(
    private translateService:TranslateService,
    private formatDateService:FormatDateService,
    private relativeDateService:RelativeDateService,
    private sanitizer: DomSanitizer,
  ) { }

  transform(task) {
    if (!task) {
      return Promise.resolve('');
    }

    return Promise
      .all([
        getState(task.state || 'received', this.translateService),
        getRecipient(task, this.translateService),
      ])
      .then(([ state, recipient ]) => {
        const relativeDate = getRelativeDate(getTaskDate(task), {
          FormatDate: this.formatDateService,
          RelativeDate: this.relativeDateService,
          prefix: state + '&nbsp;',
          suffix: recipient,
        });

        return this.sanitizer.bypassSecurityTrustHtml(relativeDate);
      });
  }
}

@Pipe({
  name: 'dateOfDeath'
})
@Injectable({
  providedIn: 'root'
})
export class DateOfDeathPipe implements PipeTransform {
  constructor(
    private translateService:TranslateService,
    private formatDateService:FormatDateService,
    private relativeDateService:RelativeDateService,
    private sanitizer: DomSanitizer,
  ) {
  }

  transform(dod) {
    if (!dod) {
      return '';
    }

    return this.sanitizer.bypassSecurityTrustHtml(getRelativeDate(dod, {
      FormatDate: this.formatDateService,
      RelativeDate: this.relativeDateService,
      withoutTime: true,
      prefix: this.translateService.instant('contact.deceased.date.prefix') + '&nbsp;'
    }));
  }
}

@Pipe({
  name: 'age'
})
@Injectable({
  providedIn: 'root'
})
export class AgePipe implements PipeTransform {
  constructor(
    private formatDateService:FormatDateService,
    private relativeDateService:RelativeDateService,
    private sanitizer: DomSanitizer,
  ) {
  }

  transform(dob, dod?) {
    return this.sanitizer.bypassSecurityTrustHtml(getRelativeDate(dob, {
      FormatDate: this.formatDateService,
      RelativeDate: this.relativeDateService,
      withoutTime: true,
      age: true,
      end: dod
    }));
  }
}


@Pipe({
  name: 'dayMonth'
})
@Injectable({
  providedIn: 'root'
})
export class DayMonthPipe implements PipeTransform {
  constructor(
    private sanitizer: DomSanitizer,
    private formatDateService:FormatDateService,
  ) {}

  transform(date) {
    return this.sanitizer.bypassSecurityTrustHtml('<span>' + this.formatDateService.dayMonth(date) + '</span>');
  }
}

@Pipe({
  name: 'relativeDate'
})
@Injectable({
  providedIn: 'root'
})
export class RelativeDatePipe implements PipeTransform {
  constructor(
    private sanitizer: DomSanitizer,
    private formatDateService:FormatDateService,
    private relativeDateService:RelativeDateService,
  ) {}

  transform(date, raw = false) {
    const options = {
      FormatDate: this.formatDateService,
      RelativeDate: this.relativeDateService,
      raw: undefined,
    };

    if (raw) {
      options.raw = true;
      return getRelativeDate(date, options);
    } else {
      return this.sanitizer.bypassSecurityTrustHtml(getRelativeDate(date, options));
    }
  }
}

@Pipe({
  name: 'relativeDay'
})
@Injectable({
  providedIn: 'root'
})
export class RelativeDayPipe implements PipeTransform {
  constructor(
    private sanitizer: DomSanitizer,
    private formatDateService:FormatDateService,
    private relativeDateService:RelativeDateService,
  ) {}

  transform(date, raw?) {
    const options = {
      FormatDate: this.formatDateService,
      RelativeDate: this.relativeDateService,
      withoutTime: true,
      raw: undefined,
    };

    if (raw) {
      options.raw = true;
      return getRelativeDate(date, options);
    } else {
      return this.sanitizer.bypassSecurityTrustHtml(getRelativeDate(date, options));
    }
  }
}


@Pipe({
  name: 'taskDueDate'
})
@Injectable({
  providedIn: 'root'
})
export class TaskDueDatePipe implements PipeTransform {
  constructor(
    private sanitizer: DomSanitizer,
    private formatDateService:FormatDateService,
    private relativeDateService:RelativeDateService,
  ) {}

  transform(date) {
    return this.sanitizer.bypassSecurityTrustHtml(getRelativeDate(date, {
      FormatDate: this.formatDateService,
      RelativeDate: this.relativeDateService,
      withoutTime: true,
      task: true
    }));
  }
}

@Pipe({
  name: 'simpleDate'
})
@Injectable({
  providedIn: 'root'
})
export class SimpleDatePipe implements PipeTransform {
  constructor(
    private formatDateService: FormatDateService,
  ) {}

  transform(date) {
    return this.formatDateService.date(date);
  }
}


@Pipe({
  name: 'simpleDateTime'
})
@Injectable({
  providedIn: 'root'
})
export class SimpleDateTimePipe implements PipeTransform {
  constructor(
    private formatDateService: FormatDateService,
  ) {}

  transform(date) {
    return this.formatDateService.datetime(date);
  }
}


@Pipe({
  name: 'fullDate'
})
@Injectable({
  providedIn: 'root'
})
export class FullDatePipe implements PipeTransform {
  constructor(
    private sanitizer: DomSanitizer,
    private formatDateService:FormatDateService,
    private relativeDateService:RelativeDateService,
  ) {}

  transform(date) {
    if (!date) {
      return '';
    }
    const cssSelector = this.relativeDateService.getCssSelector();
    const dataset = this.relativeDateService.generateDataset(date);
    const relative = this.formatDateService.relative(date);
    const absolute = this.formatDateService.datetime(date);
    return this.sanitizer.bypassSecurityTrustHtml(
      `<div class="relative-date-content ${cssSelector}" ${dataset}>${relative}</div>` +
      `<div class="full-date">${absolute}</div>`
    );
  }
}

@Pipe({
  name: 'weeksPregnant'
})
@Injectable({
  providedIn: 'root'
})
export class WeeksPregnantPipe implements PipeTransform {
  constructor() {}

  transform(weeks) {
    if (!weeks || !weeks.number) {
      return '';
    }
    const classes = [];
    if (weeks.number >= 37) {
      classes.push('upcoming-edd');
    }
    if (weeks.approximate) {
      classes.push('approximate');
    }
    const attr = classes.length ? ' class="weeks-pregnant ' + classes.join(' ') + '"' : '';
    return `<span${attr}>${weeks.number}</span>`;
  }
}
