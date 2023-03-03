import { Component, Input, ViewChild } from '@angular/core';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ResponsiveService } from '@mm-services/responsive.service';
import { FastAction, IconType } from '@mm-services/fast-action-button.service';

@Component({
  selector: 'mm-fast-action-button',
  templateUrl: './fast-action-button.component.html',
})
export class FastActionButtonComponent {

  @Input() config: FastActionConfig;
  @Input() fastActions: FastAction[];
  @ViewChild('contentWrapper') contentWrapper;

  private bottomSheetRef: MatBottomSheetRef;
  private dialogRef: MatDialogRef<any>;

  iconTypeResource = IconType.RESOURCE;
  buttonTypeFlat = ButtonType.FLAT;

  constructor(
    private responsiveService: ResponsiveService,
    private matBottomSheet: MatBottomSheet,
    private matDialog: MatDialog,
  ) { }

  async open() {
    this.closeAll();

    if (this.fastActions.length === 1) {
      this.executeAction(this.fastActions[0]);
      return;
    }

    if (this.responsiveService.isMobile()) {
      this.bottomSheetRef = this.matBottomSheet.open(this.contentWrapper, { disableClose: true });
      return;
    }

    this.dialogRef = this.matDialog.open(this.contentWrapper, {
      disableClose: true,
      minWidth: 300,
      minHeight: 150,
    });
  }

  closeAll() {
    this.bottomSheetRef?.dismiss();
    this.dialogRef?.close();
  }

  trackById(idx, action: FastAction) {
    return action.id;
  }

  executeAction(action: FastAction) {
    if (action.isDisable()) {
      return;
    }

    action.execute();
  }
}

export enum ButtonType {
  FLAT,
  FAB,
}

interface FastActionButton {
  type: ButtonType;
  label?: string;
}

export interface FastActionConfig {
  button?: FastActionButton;
  title: string;
}
