import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import * as _ from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class ScheduledFormsService {
  constructor(private settingsService:SettingsService) {
  }

  get() {
    return this.settingsService.get().then((settings:any) => {
      const results = [];
      _.forEach(_.toPairs(settings.forms), (pair) => {
        if (_.some(settings['kujua-reporting'], (report) => report.code === pair[0])) {
          results.push(pair[1]);
        }
      });
      return results;
    })
  }
}
