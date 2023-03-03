import { Component, Inject } from '@angular/core';
import { DATA_INJECTION_TOKEN } from '@mm-components/fast-action-button/fast-action-button.component';

@Component({
  selector: 'reports-fast-actions',
  templateUrl: './reports-fast-actions.component.html',
})
export class ReportsFastActionsComponent {
  showForms = false;
  showOtherActions = false;

  constructor(
    @Inject(DATA_INJECTION_TOKEN) data: any,
  ) {
    this.showForms = !!data?.showForms;
    this.showOtherActions = !!data?.showOtherActions;
  }
}
