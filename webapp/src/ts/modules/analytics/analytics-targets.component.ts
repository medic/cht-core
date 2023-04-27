import { Component, OnInit } from '@angular/core';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

@Component({
  templateUrl: './analytics-targets.component.html'
})
export class AnalyticsTargetsComponent implements OnInit {
  targets = [];
  loading = true;
  targetsDisabled = false;
  errorStack;
  telemetryData = {
    start: Date.now(),
    end: undefined
  };

  subscription = new Subscription();

  constructor(
    private rulesEngineService: RulesEngineService,
    private telemetryService: TelemetryService,
    private store: Store
  ) { }

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
      .then((targets = []) => {
        this.loading = false;
        this.targets = targets.filter(target => target.visible !== false);
        this.telemetryData.end = Date.now();
        this.telemetryService.record(`analytics:targets:load`, this.telemetryData.end - this.telemetryData.start);
      });
  }
}
