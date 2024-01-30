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
      stop: (options: Options) => this.recordPerformance(startTime, options),
    };
  }

  /**
   * Records Telemetry entry
   * @param startTime   Process start time in milliseconds
   * @param name        Telemetry entry's name
   * @param recordApdex If true, record the Apdex as additional Telemetry entry
   * @private
   */
  private async recordPerformance(startTime:number, { name, recordApdex = false }:Options) {
    if (!name || !this.document?.defaultView) {
      return;
    }

    const duration = Math.round(this.document.defaultView.performance.now() - startTime);
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
