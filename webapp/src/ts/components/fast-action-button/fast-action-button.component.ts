import { Component, Input, OnDestroy, OnInit, TrackByFunction, ViewChild } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
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
  private dialogRef: MatDialogRef<any> | undefined;
  private bottomSheetRef: MatBottomSheetRef<any> | undefined;

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
    this.useOldActionBar = !this.sessionService.isAdmin() && await this.authService.has(OLD_ACTION_BAR_PERMISSION);
  }

  /**
   * Returns a Fast Action that can be executed right away without opening the dialog or bottom sheet.
   */
  getFastExecutableAction(): FastAction | undefined {
    if (this.fastActions.length === 1 && !this.fastActions[0]?.alwaysOpenInPanel) {
      return this.fastActions[0];
    }
    return;
  }

  async open() {
    const fastExecutableAction = this.getFastExecutableAction();
    if (fastExecutableAction) {
      this.executeAction(fastExecutableAction);
      return;
    }

    this.closeAll();
    if (this.responsiveService.isMobile()) {
      this.bottomSheetRef = this.matBottomSheet.open(this.contentWrapper);
      return;
    }

    this.dialogRef = this.matDialog.open(this.contentWrapper, {
      autoFocus: false,
      minWidth: 300,
      minHeight: 150,
    });
  }

  closeAll() {
    if (this.bottomSheetRef) {
      this.bottomSheetRef.dismiss();
      this.bottomSheetRef = undefined;
    }

    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = undefined;
    }
  }

  executeAction(action: FastAction) {
    this.closeAll();
    action.execute();
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

  trackById: TrackByFunction<FastAction> = (idx, action: FastAction) => {
    return action.id;
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
