import { Injectable } from '@angular/core';

import { SettingsService } from '@mm-services/settings.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsModulesService {
  constructor(
    private settingsService: SettingsService,
    private targetAggregatesService: TargetAggregatesService,
  ) { }

  private getTargetsModule(settings) {
    return {
      id: 'targets',
      label: 'analytics.targets',
      route: ['/', 'analytics', 'targets'],
      available: () => !!(settings.tasks && settings.tasks.targets)
    };
  }

  private getTargetAggregatesModule (settings, isAggregateEnabled) {
    return {
      id: 'target-aggregates',
      label: 'analytics.target.aggregates',
      route: ['/', 'analytics', 'target-aggregates'],
      available: () => !!(settings?.tasks?.targets && isAggregateEnabled)
    };
  }

  private getModules(settings, isAggregateEnabled) {
    return [
      this.getTargetsModule(settings),
      this.getTargetAggregatesModule(settings, isAggregateEnabled),
    ].filter(module => module.available());
  }

  get() {
    return Promise
      .all([
        this.settingsService.get(),
        this.targetAggregatesService.isEnabled(),
      ])
      .then(([settings, isAggregateEnabled]) => {
        const modules = this.getModules(settings, isAggregateEnabled);
        console.debug('AnalyticsModules. Enabled modules: ', modules.map(module => module.label));
        return modules;
      });
  }

}
