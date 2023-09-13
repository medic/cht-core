import { Injectable } from '@angular/core';
import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsModulesService {
  constructor(
    private authService:AuthService,
    private settingsService:SettingsService,
  ) { }

  private getTargetsModule(settings) {
    return {
      id: 'targets',
      label: 'analytics.targets',
      route: ['/', 'analytics', 'targets'],
      available: () => !!(settings.tasks && settings.tasks.targets)
    };
  }

  private getTargetAggregatesModule (settings, canAggregateTargets) {
    return {
      id: 'target-aggregates',
      label: 'analytics.target.aggregates',
      route: ['/', 'analytics', 'target-aggregates'],
      available: () => !!(settings.tasks && settings.tasks.targets && canAggregateTargets)
    };
  }

  private getModules(settings, canAggregateTargets) {
    return [
      this.getTargetsModule(settings),
      this.getTargetAggregatesModule(settings, canAggregateTargets),
    ].filter(module => module.available());
  }

  get() {
    return Promise
      .all([
        this.settingsService.get(),
        this.authService.has('can_aggregate_targets')
      ])
      .then(([settings, canAggregateTargets]) => {
        const modules = this.getModules(settings, canAggregateTargets);
        console.debug('AnalyticsModules. Enabled modules: ', modules.map(module => module.label));
        return modules;
      });
  }

}
