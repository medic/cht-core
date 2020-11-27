import { Injectable } from '@angular/core';

import { RelativeDateService } from './relative-date.service';
import { UnreadRecordsService } from './unread-records.service';

@Injectable({
  providedIn: 'root'
})
export class RecurringProcessManagerService {

  private recurringProcesses:any = {
    updateRelativeDates: false,
    updateReadDocsCount: false
  };

  constructor(
    private relativeDateService: RelativeDateService,
    private unreadRecordsService: UnreadRecordsService
  ) { }

  private stopRecurringProcess(processName) {
    if (this.recurringProcesses[processName]) {
      clearInterval(this.recurringProcesses[processName]);
      this.recurringProcesses[processName] = false;
    }
  }

  startUpdateRelativeDate() {
    if (this.recurringProcesses.updateRelativeDates) {
      return;
    }

    this.recurringProcesses.updateRelativeDates = setInterval(
      () => this.relativeDateService.updateRelativeDates(),
      10 * 60 * 1000
    );
  }

  stopUpdateRelativeDate() {
    this.stopRecurringProcess('updateRelativeDates');
  }

  startUpdateReadDocsCount() {
    if (this.recurringProcesses.updateReadDocsCount) {
      return;
    }

    this.recurringProcesses.updateReadDocsCount = setInterval(
      () => this.unreadRecordsService.count(),
      5 * 60 * 1000
    );
  }

  stopUpdateReadDocsCount() {
    this.stopRecurringProcess('updateReadDocsCount');
  }

}
