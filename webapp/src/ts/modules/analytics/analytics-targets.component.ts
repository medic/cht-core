import { Component, OnInit } from '@angular/core';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { SessionService } from '@mm-services/session.service';
import { Store } from '@ngrx/store';
import { Selectors } from '@mm-selectors/index';
import { Subscription } from 'rxjs';

@Component({
  templateUrl: './analytics-targets.component.html'
})
export class AnalyticsTargetsComponent implements OnInit {
  targets = [];
  loading = true;
  targetsDisabled = false;
  error = false;
  errorDetails;
  url;
  currentDate;
  userCtx;
  replicationStatus;
  telemetryData = {
    start: Date.now(),
    end: undefined
  };

  subscription = new Subscription();

  private subscribeToStore() {
    const reduxSubscription = this.store.select(Selectors.getReplicationStatus)
      .subscribe((replicationStatus) => {
        this.replicationStatus = replicationStatus;
      });
    this.subscription.add(reduxSubscription);
  }

  constructor(
    private rulesEngineService: RulesEngineService,
    private telemetryService: TelemetryService,
    private sessionService: SessionService,
    private store: Store
  ) { }

  ngOnInit(): void {
    this.subscribeToStore();
    this.getTargets();
    this.url = window.location.hostname;
    this.currentDate = Date.now();
    this.userCtx = this.sessionService.userCtx();
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
        this.errorDetails = err.stack;
        this.error = true;
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
