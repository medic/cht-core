import { Component, OnInit } from '@angular/core';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { PerformanceService } from '@mm-services/performance.service';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { ErrorLogComponent } from '../../components/error-log/error-log.component';
import {
  AnalyticsTargetsProgressComponent
} from '../../components/analytics-targets-progress/analytics-targets-progress.component';
import { TranslatePipe } from '@ngx-translate/core';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { TranslateFromPipe } from '@mm-pipes/translate-from.pipe';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';

@Component({
  templateUrl: './analytics-targets.component.html',
  imports: [
    NgIf,
    ErrorLogComponent,
    NgFor,
    NgClass,
    AnalyticsTargetsProgressComponent,
    TranslatePipe,
    ResourceIconPipe,
    TranslateFromPipe,
    LocalizeNumberPipe
  ]
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
