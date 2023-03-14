import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

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

  private subscription: Subscription = new Subscription();
  private bottomSheetRef: MatBottomSheetRef;
  private dialogRef: MatDialogRef<any>;

  selectMode = false;
  useOldActionBar = false;
  iconTypeResource = IconType.RESOURCE;
  iconTypeFontAwesome = IconType.FONT_AWESOME;
  buttonTypeFlat = ButtonType.FLAT;

  constructor(
    private store: Store,
    private authService: AuthService,
    private sessionService: SessionService,
    private responsiveService: ResponsiveService,
    private matBottomSheet: MatBottomSheet,
    private matDialog: MatDialog,
  ) { }

  ngOnInit() {
    this.checkPermissions();
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private subscribeToStore() {
    const selectModeSubscription = this.store
      .select(Selectors.getSelectMode)
      .subscribe(selectMode => this.selectMode = selectMode);
    this.subscription.add(selectModeSubscription);
  }

  private async checkPermissions() {
    this.useOldActionBar = !this.sessionService.isDbAdmin() && await this.authService.has(OLD_ACTION_BAR_PERMISSION);
  }

  /**
   * Returns a Fast Action that can be executed right away without opening the dialog or bottom sheet.
   */
  private getFastExecutableAction(): FastAction {
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
      this.bottomSheetRef = this.matBottomSheet.open(this.contentWrapper);
      return;
    }

    this.dialogRef = this.matDialog.open(this.contentWrapper, { minWidth: 300, minHeight: 150 });
  }

  closeAll() {
    this.bottomSheetRef?.dismiss();
    this.dialogRef?.close();
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
