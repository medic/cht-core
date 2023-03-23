import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { ResponsiveService } from '@mm-services/responsive.service';
import { FastAction, IconType } from '@mm-services/fast-action-button.service';
import { OLD_ACTION_BAR_PERMISSION } from '@mm-components/actionbar/actionbar.component';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { Selectors } from '@mm-selectors/index';

@Component({
  selector: 'mm-fast-action-button',
  templateUrl: './fast-action-button.component.html',
})
export class FastActionButtonComponent implements OnInit, OnDestroy {

  @Input() config: FastActionConfig;
  @Input() fastActions: FastAction[];
  @ViewChild('contentWrapper') contentWrapper;

  private subscriptions: Subscription = new Subscription();

  selectMode = false;
  useOldActionBar = false;
  iconTypeResource = IconType.RESOURCE;
  iconTypeFontAwesome = IconType.FONT_AWESOME;
  buttonTypeFlat = ButtonType.FLAT;

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private sessionService: SessionService,
    private responsiveService: ResponsiveService,
    private matBottomSheet: MatBottomSheet,
    private matDialog: MatDialog,
  ) { }

  ngOnInit() {
    this.checkPermissions();
    this.subscribeToStore();
    this.subscribeToRouter();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private subscribeToRouter() {
    const routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(() => this.closeAll());
    this.subscriptions.add(routerSubscription);
  }

  private subscribeToStore() {
    const selectModeSubscription = this.store
      .select(Selectors.getSelectMode)
      .subscribe(selectMode => this.selectMode = selectMode);
    this.subscriptions.add(selectModeSubscription);
  }

  private async checkPermissions() {
    this.useOldActionBar = !this.sessionService.isDbAdmin() && await this.authService.has(OLD_ACTION_BAR_PERMISSION);
  }

  /**
   * Returns a Fast Action that can be executed right away without opening the dialog or bottom sheet.
   */
  getFastExecutableAction(): FastAction {
    if (this.fastActions.length === 1 && !this.fastActions[0]?.alwaysOpenInPanel) {
      return this.fastActions[0];
    }
    return;
  }

  async open() {
    this.closeAll();

    const fastExecutableAction = this.getFastExecutableAction();
    if (fastExecutableAction) {
      this.executeAction(fastExecutableAction);
      return;
    }

    if (this.responsiveService.isMobile()) {
      this.matBottomSheet.open(this.contentWrapper);
      return;
    }

    this.matDialog.open(this.contentWrapper, {
      autoFocus: false,
      minWidth: 300,
      minHeight: 150,
    });
  }

  closeAll() {
    this.matBottomSheet.dismiss();
    this.matDialog.closeAll();
  }

  executeAction(action: FastAction) {
    if (!action.execute) {
      return;
    }
    action.execute();
    this.closeAll();
  }

  trackById(idx, action: FastAction) {
    return action.id;
  }

  getTriggerButtonIcon() {
    const plusIcon = 'fa-plus';

    const fastExecutableAction = this.getFastExecutableAction();
    if (fastExecutableAction?.icon?.type === IconType.FONT_AWESOME && fastExecutableAction?.icon?.name) {
      return fastExecutableAction.icon.name;
    }

    return plusIcon;
  }

  getActionLabel() {
    const fastExecutableAction = this.getFastExecutableAction();
    return fastExecutableAction?.label || fastExecutableAction?.labelKey;
  }
}

/**
 * FastActionConfig:
 *   title - The title to display in the modal or bottom sheet header.
 *   button - Define the trigger button type (FLAT or FAB) and the label.
 */
export interface FastActionConfig {
  title?: string;
  button?: FastActionButton;
}

export enum ButtonType {
  FLAT,
  FAB,
}

interface FastActionButton {
  type: ButtonType;
  label?: string;
}
