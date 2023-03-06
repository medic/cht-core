import { Injectable } from '@angular/core';

import { AuthService } from '@mm-services/auth.service';
import { ResponsiveService } from '@mm-services/responsive.service';

@Injectable({
  providedIn: 'root'
})
export class FastActionButtonService {

  constructor(
    private authService: AuthService,
    private responsiveService: ResponsiveService,
  ) { }

  private async filterActions(actions) {
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
      id: xmlForms.code,
      testId: xmlForms.code,
      label: form.title,
      icon: {
        name: form.icon,
        type: IconType.RESOURCE,
      },
      isDisable: () => {
        return false;
      },
      canDisplay: () => {
        return 'form - 2' === form.title ? Promise.resolve(false) : this.authService.has('can_edit');
      },
      execute: () => {
        return;
      },
    }));
  }

  getLeftSideReportActions(): Promise<FastAction[]> {
    const actions = [];

    return this.filterActions(actions);
  }

  getRightSideReportActions(xmlForms): Promise<FastAction[]> {
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
  isDisable(): boolean;
  canDisplay(): Promise<boolean>;
  execute(): void;
  label: string;
  icon: FastActionIcon;
  id: string;
  testId: string;
}
