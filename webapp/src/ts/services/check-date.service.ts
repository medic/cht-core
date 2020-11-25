import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { TelemetryService } from './telemetry.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
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

  showModal(dates: CheckDateData) {
    this.modalService
      .show(CheckDateComponent, {initialState: dates})
      .catch(() => {});
  }

  check() {
    return this
      .http
      .head('/api/info?seed=' + Math.random(), { observe: 'response' })
      .toPromise()
      .then((response: any) => {
        const timestamp = Date.parse(response.headers.get('Date'));
        if (isNaN(timestamp)) {
          return;
        }

        const delta = Date.now() - timestamp;
        if (Math.abs(delta) < MARGIN_OF_ERROR) {
          // Date/time differences of less than 10 minutes are not very concerning to us
          return;
        }
        this.telemetryService.record('client-date-offset', delta);
        this.showModal({
          reportedLocalDate: new Date(),
          expectedLocalDate: new Date(timestamp)
        });
      })
      .catch(() => {
        // if server request fails, then check date against 2020-11-24, or
        // any more recent date in the past that developers choose to update
        // the check value to.
        if (Date.now() < A_DATE_IN_THE_PAST) {
          this.showModal({ reportedLocalDate: new Date() });
        }
      });
  }
}
