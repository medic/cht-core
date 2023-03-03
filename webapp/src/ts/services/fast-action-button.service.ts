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

  private getFormActions(forms): FastAction[] {
    return (forms || []).map(form => ({
      id: forms.code,
      testId: forms.code,
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

  getAllReportFastActions(forms, onlyFormActions = false): Promise<FastAction[]> {
    let actions = [ ...this.getFormActions(forms) ];

    if (!onlyFormActions) {
      actions = [
        ...actions,
      ];
    }

    return this.filterActions(actions);
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
