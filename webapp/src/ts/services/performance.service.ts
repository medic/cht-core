import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { TelemetryService } from '@mm-services/telemetry.service';
import { AuthService } from '@mm-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private readonly TRACK_PERFORMANCE = 'track_performance';
  private trackPerformance = true;

  constructor(
    private telemetryService: TelemetryService,
    private authService: AuthService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.authService
      .has(this.TRACK_PERFORMANCE)
      .then(result => this.trackPerformance = result);
  }

  track(name: string) {
    if (!this.trackPerformance || !name || !this.document?.defaultView) {
      return;
    }

    const startTime = this.document.defaultView.performance.now();
    return {
      name,
      stop: () => this.recordPerformance(name, startTime),
    };
  }

  private async recordPerformance(name: string, startTime: number) {
    if (!this.trackPerformance || !this.document?.defaultView) {
      return;
    }

    const time = this.document.defaultView.performance.now() - startTime;
    await this.telemetryService.record(name, time);
  }
}
