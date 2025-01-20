import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { PerformanceService } from '@mm-services/performance.service';
import { Selectors } from '@mm-selectors/index';

@Component({
  templateUrl: './analytics-targets.component.html'
})
export class AnalyticsTargetsComponent implements OnInit {
  targets: any[] = [];
  loading = true;
  targetsDisabled = false;
  errorStack;
  trackPerformance;
  direction;

  constructor(
    private rulesEngineService: RulesEngineService,
    private performanceService: PerformanceService,
    private store: Store,
  ) {
    this.trackPerformance = this.performanceService.track();
    this.store.select(Selectors.getDirection).subscribe(direction => {
      this.direction = direction;
    });
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
