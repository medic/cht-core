import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { TelemetryService } from '@mm-services/telemetry.service';
import { AuthService } from '@mm-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private trackPerformance = true;
  private readonly CAN_TRACK_PERFORMANCE = 'track_performance';
  private readonly TELEMETRY_PERFORMANCE_PREFIX = 'perf:';
  private readonly TELEMETRY_APDEX_SUBFIX = ':apdex';
  private readonly APXDEX_T = 3 * 1000;
  private readonly APXDEX_TOLERANCE = 4; // 4xT

  constructor(
    private telemetryService: TelemetryService,
    private authService: AuthService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.authService
      .has(this.CAN_TRACK_PERFORMANCE)
      .then(result => this.trackPerformance = result);
  }

  track(name: string) {
    if (!this.trackPerformance || !name || !this.document?.defaultView) {
      return;
    }

    const startTime = this.document.defaultView.performance.now();
    return {
      setName: newName => name = newName,
      stop: (recordApdex?) => this.recordPerformance(name, startTime, recordApdex),
    };
  }

  private async recordPerformance(name: string, startTime: number, recordApdex = false) {
    if (!this.trackPerformance || !this.document?.defaultView) {
      return;
    }

    const time = this.document.defaultView.performance.now() - startTime;
    await this.telemetryService.record(this.TELEMETRY_PERFORMANCE_PREFIX + name, time);

    if (recordApdex) {
      await this.recordApDex(name, time);
    }
  }

  private async recordApDex(name: string, time: number) {
    if (time <= this.APXDEX_T) {
      await this.telemetryService.record(
        this.TELEMETRY_PERFORMANCE_PREFIX + name + this.TELEMETRY_APDEX_SUBFIX + ':satisfied'
      );
      return;
    }

    if (time <= (this.APXDEX_TOLERANCE * this.APXDEX_T)) {
      await this.telemetryService.record(
        this.TELEMETRY_PERFORMANCE_PREFIX + name + this.TELEMETRY_APDEX_SUBFIX + ':tolerating'
      );
      return;
    }

    await this.telemetryService.record(
      this.TELEMETRY_PERFORMANCE_PREFIX + name + this.TELEMETRY_APDEX_SUBFIX + ':frustrated'
    );
  }
}
