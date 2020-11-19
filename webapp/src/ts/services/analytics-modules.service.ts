import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { AuthService } from './auth.service';
import { ScheduledFormsService } from './scheduled-forms.service';


@Injectable({
  providedIn: 'root'
})
export class AnalyticsModulesService {
  constructor(
    private authService:AuthService,
    private scheduledFormsService:ScheduledFormsService,
    private settingsService:SettingsService,
  ) {
  }

  private getTargetsModule(settings) {
    return {
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
    return {
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
