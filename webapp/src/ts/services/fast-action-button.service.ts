import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Store } from '@ngrx/store';

import { AuthService } from '@mm-services/auth.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { ReportsActions } from '@mm-actions/reports';
import { ButtonType } from '@mm-components/fast-action-button/fast-action-button.component';
import { TranslateService } from '@mm-services/translate.service';
import { TranslateFromService } from '@mm-services/translate-from.service';

@Injectable({
  providedIn: 'root'
})
export class FastActionButtonService {

  private reportsActions: ReportsActions;

  constructor(
    private router: Router,
    private store: Store,
    private authService: AuthService,
    private responsiveService: ResponsiveService,
    private translateService: TranslateService,
    private translateFromService: TranslateFromService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.reportsActions = new ReportsActions(store);
  }

  private executeMailto(link) {
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

  private getFormTitle(labelKey?: string, label?: string): string|undefined {
    if (labelKey) {
      return this.translateService.instant(labelKey);
    }

    if (label) {
      return this.translateFromService.get(label);
    }
  }

  private getReportFormActions(xmlForms, callbackContactReportModal?): FastAction[] {
    return (xmlForms || [])
      .map(form => ({
        id: form.code,
        label: this.getFormTitle(form.titleKey, form.title) || form.code,
        icon: { name: form.icon, type: IconType.RESOURCE },
        alwaysOpenInPanel: true,
        canDisplay: () => this.authService.has('can_edit'),
        execute: () => {
          if (callbackContactReportModal) {
            callbackContactReportModal(form);
            return;
          }
          this.router.navigate(['/reports', 'add', form.code]);
        },
      }))
      .sort((a, b) => a.label?.localeCompare(b.label));
  }

  private getContactFormActions(childContactTypes, userFacilityId): FastAction[] {
    return (childContactTypes || [])
      .map(contactType => ({
        id: contactType.id,
        label: this.getFormTitle(contactType.create_key) || contactType.id,
        icon: { name: contactType.icon, type: IconType.RESOURCE },
        canDisplay: () => this.authService.has(['can_edit', 'can_create_places']),
        execute: () => {
          const route = ['/contacts', 'add', contactType.id];
          if (userFacilityId) {
            // Inserting facility's ID between "/contacts" and "add" router segments.
            route.splice(1, 0, userFacilityId);
          }
          this.router.navigate(route, { queryParams: { from: 'list' } });
        },
      }))
      .sort((a, b) => a.label?.localeCompare(b.label));
  }

  private getSendMessageAction(context: CommunicationActionsContext, config: CommunicationActionsConfig = {}) {
    const { sendTo, callbackOpenSendMessage } = context;
    const { isPhoneRequired, useMailtoInMobile } = config;

    const validatePhone = () => isPhoneRequired ? !!sendTo?.phone : true;
    const canUseMailto = () => useMailtoInMobile && this.responsiveService.isMobile();

    return {
      id: 'send-message',
      labelKey: 'fast_action_button.send_message',
      icon: { name: 'fa-envelope', type: IconType.FONT_AWESOME },
      canDisplay: async () => {
        const permission = [ 'can_view_message_action' ];
        !canUseMailto() && permission.push('can_edit');
        return validatePhone() && await this.authService.has(permission);
      },
      execute: () => {
        if (canUseMailto()) {
          this.executeMailto(`sms:${sendTo?.phone}`);
          return;
        }
        callbackOpenSendMessage && callbackOpenSendMessage(sendTo?._id);
      },
    };
  }

  private getPhoneAction(context: CommunicationActionsContext) {
    return {
      id: 'phone-call',
      labelKey: 'fast_action_button.phone_call',
      icon: { name: 'fa-phone', type: IconType.FONT_AWESOME },
      canDisplay: async () => {
        return context.sendTo?.phone
          && await this.authService.has('can_view_call_action')
          && this.responsiveService.isMobile();
      },
      execute: () => this.executeMailto(`tel:${context.sendTo?.phone}`),
    };
  }

  private getUpdateFacilityAction(reportContentType) {
    return {
      id: 'update-facility',
      labelKey: 'fast_action_button.update_facility',
      icon: { name: 'fa-pencil', type: IconType.FONT_AWESOME },
      canDisplay: async () => reportContentType !== 'xml' && await this.authService.has('can_edit'),
      execute: () => this.reportsActions.launchEditFacilityDialog(),
    };
  }

  getReportRightSideActions(context: ReportActionsContext): Promise<FastAction[]> {
    const actions = [
      this.getSendMessageAction(context.communicationContext, { isPhoneRequired: true, useMailtoInMobile: true }),
      this.getUpdateFacilityAction(context.reportContentType),
    ];

    return this.filterActions(actions);
  }

  getReportLeftSideActions(context: ReportActionsContext): Promise<FastAction[]> {
    const actions = this.getReportFormActions(context.xmlReportForms);

    return this.filterActions(actions);
  }

  getContactLeftSideActions(context: ContactActionsContext): Promise<FastAction[]> {
    const actions = this.getContactFormActions(context.childContactTypes, context.userFacilityId);

    return this.filterActions(actions);
  }

  getContactRightSideActions(context: ContactActionsContext): Promise<FastAction[]> {
    const actions = [
      this.getPhoneAction(context.communicationContext),
      this.getSendMessageAction(context.communicationContext, { isPhoneRequired: true, useMailtoInMobile: true }),
      ...this.getContactFormActions(context.childContactTypes, context.userFacilityId),
      ...this.getReportFormActions(context.xmlReportForms, context.callbackContactReportModal),
    ];

    return this.filterActions(actions);
  }

  getMessageActions(context: CommunicationActionsContext): Promise<FastAction[]> {
    const actions = [
      this.getSendMessageAction(context),
    ];

    return this.filterActions(actions);
  }

  getButtonTypeForContentList() {
    return this.responsiveService.isMobile() ? ButtonType.FAB : ButtonType.FLAT;
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
  alwaysOpenInPanel?: boolean;
  canDisplay(): Promise<boolean>;
  execute(): void;
}

interface ReportActionsContext {
  reportContentType?: string;
  xmlReportForms?: Record<string, any>[];
  communicationContext?: CommunicationActionsContext;
}

interface ContactActionsContext {
  userFacilityId?: string;
  childContactTypes?: Record<string, any>[];
  xmlReportForms?: Record<string, any>[];
  communicationContext?: CommunicationActionsContext;
  callbackContactReportModal?(form: Record<string, any>): void;
}

interface CommunicationActionsContext {
  sendTo?: Record<string, any>;
  callbackOpenSendMessage(sendTo?: Record<string, any>): void;
}

interface CommunicationActionsConfig {
  isPhoneRequired?: boolean;
  useMailtoInMobile?: boolean;
}
