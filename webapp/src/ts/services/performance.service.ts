import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { TelemetryService } from '@mm-services/telemetry.service';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private readonly APDEX_LABEL = 'apdex';
  private readonly APDEX_SATISFIED = 'satisfied';
  private readonly APDEX_TOLERABLE = 'tolerable';
  private readonly APDEX_FRUSTRATED = 'frustrated';
  private readonly APDEX_T = 3 * 1000;
  private readonly APDEX_TOLERANCE = 4; // 4xT

  constructor(
    private telemetryService: TelemetryService,
    @Inject(DOCUMENT) private document: Document,
  ) { }

  track() {
    if (!this.document?.defaultView) {
      return;
    }
    const startTime = this.document.defaultView.performance.now();
    return {
      stop: (options: Options) => this.stopTracking(startTime, options),
    };
  }

  private async stopTracking(startTime: number, options: Options) {
    if (!this.document?.defaultView) {
      return;
    }

    const duration = Math.round(this.document.defaultView.performance.now() - startTime);
    await this.recordPerformance(options, duration);
  }

  /**
   * Records Telemetry entry
   * Prefer using the track() function. Only use recordPerformance() in cases where the track()
   * can't be called, for example: bootstrap times because these are recorded before Angular has initiated.
   * @param name        Telemetry entry's name
   * @param recordApdex If true, record the Apdex as additional Telemetry entry
   * @param duration    Time in milliseconds that the process took to complete.
   * @private
   */
  async recordPerformance({ name, recordApdex = false }: Options, duration = 0) {
    if (!name) {
      return;
    }

    await this.telemetryService.record(name, duration);

    if (recordApdex) {
      const result = this.evaluateApdex(duration);
      const apdexTelemetry = [ name, this.APDEX_LABEL, result ].join(':');
      await this.telemetryService.record(apdexTelemetry, duration);
    }
  }
  
  private evaluateApdex(duration: number) {
    if (duration <= this.APDEX_T) {
      return this.APDEX_SATISFIED;
    }
    
    if (duration <= (this.APDEX_TOLERANCE * this.APDEX_T)) {
      return this.APDEX_TOLERABLE;
    }

    return this.APDEX_FRUSTRATED;
  }
}

interface Options {
  name: string;
  recordApdex?: boolean;
}
