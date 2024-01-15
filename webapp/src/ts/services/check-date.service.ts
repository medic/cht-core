import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { TelemetryService } from '@mm-services/telemetry.service';
import { ModalService } from '@mm-services/modal.service';
import { CheckDateComponent } from '@mm-modals/check-date/check-date.component';

const A_DATE_IN_THE_PAST = 1606230000000;   // 2020-11-24T15:00:00.000Z
const MARGIN_OF_ERROR = 10 * 60 * 1000;     // ten minutes

interface CheckDateData {
  reportedLocalDate: Date;
  expectedLocalDate?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CheckDateService {
  constructor(
    private http: HttpClient,
    private telemetryService: TelemetryService,
    private modalService: ModalService,
  ) {
  }

  private checked = false;

  showModal(dates: CheckDateData) {
    this.modalService.show(CheckDateComponent, { data: dates });
  }

  check(showModal?) {
    if (this.checked) {
      return Promise.resolve();
    }

    return this.http
      .head('/api/info?seed=' + Math.random(), { observe: 'response' })
      .toPromise()
      .then((response: any) => {
        const timestamp = Date.parse(response.headers.get('Date'));
        if (isNaN(timestamp)) {
          return;
        }

        this.checked = true;
        const delta = Date.now() - timestamp;
        if (Math.abs(delta) < MARGIN_OF_ERROR) {
          // Date/time differences of less than 10 minutes are not very concerning to us
          return;
        }
        this.telemetryService.record('client-date-offset', delta);
        if (showModal) {
          this.showModal({
            reportedLocalDate: new Date(),
            expectedLocalDate: new Date(timestamp)
          });
        }
      })
      .catch(() => {
        // if server request fails, then check date against 2020-11-24, or
        // any more recent date in the past that developers choose to update
        // the check value to.
        if (Date.now() < A_DATE_IN_THE_PAST && showModal) {
          this.showModal({ reportedLocalDate: new Date() });
        }
      });
  }
}
