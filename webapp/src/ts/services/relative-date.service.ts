import * as moment from 'moment';
import { Injectable } from '@angular/core';
import { FormatDateService } from './format-date.service';

@Injectable({
  providedIn: 'root'
})
export class RelativeDateService {
  constructor(private formatDateService:FormatDateService) {
  }

  private readonly skipOptions = ['FormatDate', 'RelativeDate', 'suffix', 'prefix'];
  private readonly config = {
    cssSelector: 'update-relative-date'
  };

  getCssSelector() {
    return this.config.cssSelector;
  }

  getRelativeDate(timestamp, options) {
    if (options.age) {
      return this.formatDateService.age(timestamp, options);
    }
    if (options.absoluteToday &&
      !options.withoutTime &&
      moment(timestamp).isSame(moment(), 'day')) {
      return this.formatDateService.time(timestamp);
    }
    return this.formatDateService.relative(timestamp, options);
  }

  generateDataset(date, options?) {
    const dataAttributes:any = {};
    const momentDate = moment(date);

    dataAttributes.date = momentDate.valueOf();

    for (const key in options) {
      if (typeof options[key] !== 'object' && this.skipOptions.indexOf(key) === -1 && options[key]) {
        dataAttributes[key] = options[key];
      }
    }

    return `data-date-options='${JSON.stringify(dataAttributes)}'`;
  }

  updateRelativeDates() {
    const elements = document.querySelectorAll('.' + this.config.cssSelector);
    elements.forEach((element:HTMLElement) => {
      const dataset = element.dataset.dateOptions;
      let options;
      if (!dataset) {
        return;
      }

      try {
        options = JSON.parse(dataset);
      } catch (e) {
        return;
      }

      const timestamp = parseInt(options.date);

      const isTimestamp = (new Date(timestamp)).getTime() > 0;
      if (!isTimestamp) {
        return;
      }

      element.textContent = this.getRelativeDate(timestamp, options);
    });
  }
}

