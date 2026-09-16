import { Injectable } from '@angular/core';

export interface VisitCountSettings {
  monthStartDate?: number; // Ex: 26
  visitCountGoal?: number;
  useBikramSambatMonths?: boolean;
}

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

  getUseBikramSambatMonths(settings) {
    return !!settings?.uhc?.visit_count?.use_bikram_sambat_months;
  }

  getVisitCountSettings(settings?): VisitCountSettings {
    if (!settings || !settings.uhc || !settings.uhc.visit_count) {
      return {};
    }

    const res: VisitCountSettings = {
      monthStartDate: this.getMonthStartDate(settings),
      visitCountGoal: settings.uhc.visit_count.visit_count_goal,
    };
    if (this.getUseBikramSambatMonths(settings)) {
      res.useBikramSambatMonths = true;
    }
    return res;
  }

  getContactsDefaultSort(settings) {
    return settings &&
      settings.uhc &&
      settings.uhc.contacts_default_sort;
  }
}
