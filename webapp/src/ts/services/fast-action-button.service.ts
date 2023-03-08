import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Store } from '@ngrx/store';

import { AuthService } from '@mm-services/auth.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ReportsActions } from '@mm-actions/reports';

@Injectable({
  providedIn: 'root'
})
export class FastActionButtonService {

  private globalActions: GlobalActions;
  private reportsActions: ReportsActions;
  private sendTo;
  private reportContentType;
  private callbackOpenSendMessage;

  constructor(
    private router: Router,
    private store: Store,
    private authService: AuthService,
    private responsiveService: ResponsiveService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.globalActions = new GlobalActions(store);
    this.reportsActions = new ReportsActions(store);
    this.subscribeToStore();
  }

  private subscribeToStore() {
    this.store
      .select(Selectors.getActionBar)
      .subscribe(actionBar => {
        this.sendTo = actionBar?.right?.sendTo;
        this.reportContentType = actionBar?.right?.type;
        this.callbackOpenSendMessage = actionBar?.right?.openSendMessageModal;
      });
  }

  private executeMailtoLink(link) {
    const element = this.document.createElement('a');
    element.href = link;
    element.click();
    element.remove();
  }

  private async filterActions(actions: FastAction[]): Promise<FastAction[]> {
    const filteredActions = [];

    for (const action of actions) {
      if (await action.canDisplay()) {
        filteredActions.push(action);
      }
    }

    return filteredActions;
  }

  private getFormActions(xmlForms): FastAction[] {
    return (xmlForms || []).map(form => ({
      id: form.code,
      label: form.title || form.code,
      icon: { name: form.icon, type: IconType.RESOURCE },
      isDisable: () => false,
      canDisplay: () => this.authService.has('can_edit'),
      execute: () => this.router.navigate(['/reports', 'add', form.code]),
    }));
  }

  private getSendMessageAction() {
    return {
      id: 'send-message',
      labelKey: 'fast_action_button.send_message',
      icon: { name: 'fa-envelope', type: IconType.FONT_AWESOME },
      isDisable: () => !this.sendTo?.phone || !this.sendTo?._id,
      canDisplay: () => {
        const permission = [ 'can_view_message_action' ];
        if (!this.responsiveService.isMobile()) {
          permission.push('can_edit');
        }
        return this.authService.has(permission);
      },
      execute: () => {
        if (this.responsiveService.isMobile()) {
          this.executeMailtoLink(`sms:${this.sendTo?.phone}`);
          return;
        }
        this.callbackOpenSendMessage && this.callbackOpenSendMessage(this.sendTo?._id);
      },
    };
  }

  private getUpdateFacilityAction() {
    return {
      id: 'update-facility',
      labelKey: 'fast_action_button.update_facility',
      icon: { name: 'fa-pencil', type: IconType.FONT_AWESOME },
      isDisable: () => false,
      canDisplay: async () => this.reportContentType !== 'xml' && await this.authService.has('can_edit'),
      execute: () => this.reportsActions.launchEditFacilityDialog(),
    };
  }

  getReportRightSideActions(): Promise<FastAction[]> {
    const actions = [
      this.getSendMessageAction(),
      this.getUpdateFacilityAction(),
    ];

    return this.filterActions(actions);
  }

  getReportLeftSideActions(xmlForms): Promise<FastAction[]> {
    return this.filterActions(this.getFormActions(xmlForms));
  }
}

export enum IconType {
  RESOURCE,
  FONT_AWESOME,
}

interface FastActionIcon {
  type: IconType;
  name: string;
}

export interface FastAction {
  id: string;
  label?: string;
  labelKey?: string;
  icon: FastActionIcon;
  isDisable(): boolean;
  canDisplay(): Promise<boolean>;
  execute(): void;
}
