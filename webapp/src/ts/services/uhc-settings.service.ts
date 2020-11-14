import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UHCSettingsService {
  constructor() {}

  getMonthStartDate(settings) {
    return settings &&
      settings.uhc &&
      (
        settings.uhc.month_start_date ||
        settings.uhc.visit_count &&
        settings.uhc.visit_count.month_start_date
      );
  }

  getVisitCountSettings(settings) {
    if (!settings || !settings.uhc || !settings.uhc.visit_count) {
      return {};
    }

    return {
      monthStartDate: this.getMonthStartDate(settings),
      visitCountGoal: settings.uhc.visit_count.visit_count_goal,
    };
  }

  getContactsDefaultSort(settings) {
    return settings &&
      settings.uhc &&
      settings.uhc.contacts_default_sort;
  }
}
