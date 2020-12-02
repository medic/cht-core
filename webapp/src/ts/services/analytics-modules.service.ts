import { Injectable } from '@angular/core';

import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';
import { ScheduledFormsService } from '@mm-services/scheduled-forms.service';


@Injectable({
  providedIn: 'root'
})
export class AnalyticsModulesService {
  constructor(
    private authService:AuthService,
    private scheduledFormsService:ScheduledFormsService,
    private settingsService:SettingsService,
  ) { }

  private getTargetsModule(settings) {
    return {
      id: 'targets',
      label: 'analytics.targets',
      route: 'analytics/targets',
      available: () => {
        return settings.tasks &&
          settings.tasks.targets &&
          settings.tasks.targets.enabled;
      }
    };
  }

  private getTargetAggregatesModule (settings, canAggregateTargets) {
    return {
      id: 'target-aggregates',
      label: 'analytics.target.aggregates',
      route: 'analytics/target-aggregates',
      available: () => {
        return settings.tasks &&
          settings.tasks.targets &&
          settings.tasks.targets.enabled &&
          canAggregateTargets;
      }
    };
  }

  private getReportingRatesModule(settings, scheduledForms) {
    // ToDo: To confirm if removing this module. Migration: #26
    return {
      id: 'reporting',
      label: 'Reporting Rates',
      route: 'analytics/reporting',
      available: () => {
        return scheduledForms.length;
      }
    };
  }

  private getModules(settings, scheduledForms, canAggregateTargets) {
    return [
      this.getReportingRatesModule(settings, scheduledForms),
      this.getTargetsModule(settings),
      this.getTargetAggregatesModule(settings, canAggregateTargets),
    ].filter(module => module.available());
  }

  get() {
    return Promise
      .all([
        this.settingsService.get(),
        this.scheduledFormsService.get(),
        this.authService.has('can_aggregate_targets')
      ])
      .then(([settings, scheduledForms, canAggregateTargets]) => {
        const modules = this.getModules(settings, scheduledForms, canAggregateTargets);
        console.debug('AnalyticsModules. Enabled modules: ', modules.map(module => module.label));
        return modules;
      });
  }

}
