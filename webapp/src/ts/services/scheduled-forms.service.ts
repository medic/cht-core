import { Injectable } from '@angular/core';
import * as _ from 'lodash-es';

import { SettingsService } from '@mm-services/settings.service';

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
    });
  }
}
