import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { TelemetryService } from '@mm-services/telemetry.service';
import { AuthService } from '@mm-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private trackPerformance = false;
  private readonly CAN_TRACK_PERFORMANCE = 'track_performance';
  private readonly PERFORMANCE_PREFIX = 'perf:';
  private readonly APDEX_SUBFIX = ':apdex';
  private readonly APDEX_SATISFIED = ':satisfied';
  private readonly APDEX_TOLERATING = ':tolerable';
  private readonly APDEX_FRUSTRATED = ':frustrated';
  private readonly APDEX_AGGREGATE = ':aggregate';
  private readonly APDEX_T = 3 * 1000;
  private readonly APDEX_TOLERANCE = 4; // 4xT

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
      stop: (recordApdex = false, prefix = true) => this.recordPerformance(name, startTime, recordApdex, prefix),
    };
  }

  /**
   * Records Telemetry entry
   * @param name        Telemetry entry's name
   * @param startTime   Process start time in milliseconds
   * @param recordApdex If true, then record Apdex as additional Telemetry entry
   * @param prefix      If false, then don't prefix with "perf:" the Telemetry entry's name. Introduced to keep old
   *                    Telemetry entries' name.
   * @private
   */
  private async recordPerformance(name: string, startTime: number, recordApdex = false, prefix = true) {
    if (!this.trackPerformance || !this.document?.defaultView) {
      return;
    }

    const telemetryName = prefix ? this.PERFORMANCE_PREFIX + name : name;
    const time = this.document.defaultView.performance.now() - startTime;
    await this.telemetryService.record(telemetryName, time);

    if (recordApdex) {
      const { component, aggregate } = this.getApdexLabels(name, time);
      await this.telemetryService.record(component, time);
      await this.telemetryService.record(aggregate, time);
    }
  }
  
  private getApdexLabels(name: string, time: number) {
    const component = this.PERFORMANCE_PREFIX + name + this.APDEX_SUBFIX;
    const aggregate = this.PERFORMANCE_PREFIX + 'app' + this.APDEX_SUBFIX + this.APDEX_AGGREGATE;

    if (time <= this.APDEX_T) {
      return {
        component: component + this.APDEX_SATISFIED,
        aggregate: aggregate + this.APDEX_SATISFIED,
      };
    }
    
    if (time <= (this.APDEX_TOLERANCE * this.APDEX_T)) {
      return {
        component: component + this.APDEX_TOLERATING,
        aggregate: aggregate + this.APDEX_TOLERATING,
      };
    }

    return {
      component: component + this.APDEX_FRUSTRATED,
      aggregate: aggregate + this.APDEX_FRUSTRATED,
    };
  }
}
