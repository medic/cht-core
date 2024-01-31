import { Component, OnInit } from '@angular/core';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { PerformanceService } from '@mm-services/performance.service';

@Component({
  templateUrl: './analytics-targets.component.html'
})
export class AnalyticsTargetsComponent implements OnInit {
  targets: any[] = [];
  loading = true;
  targetsDisabled = false;
  errorStack;
  trackPerformance;

  constructor(
    private rulesEngineService: RulesEngineService,
    private performanceService: PerformanceService
  ) {
    this.trackPerformance = this.performanceService.track();
  }

  ngOnInit(): void {
    this.getTargets();
  }

  private getTargets() {
    return this.rulesEngineService
      .isEnabled()
      .then(isEnabled => {
        this.targetsDisabled = !isEnabled;
        return isEnabled ? this.rulesEngineService.fetchTargets() : [];
      })
      .catch(err => {
        console.error('Error getting targets', err);
        this.errorStack = err.stack;
        return [];
      })
      .then((targets: any[] = []) => {
        this.loading = false;
        this.targets = targets.filter(target => target.visible !== false);
        this.trackPerformance?.stop({
          name: [ 'analytics', 'targets', 'load' ].join(':'),
          recordApdex: true,
        });
      });
  }
}
