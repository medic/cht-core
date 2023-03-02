import { Component, OnInit, TemplateRef, ViewChild, Input } from '@angular/core';
import { ComponentPortal, ComponentType, Portal } from '@angular/cdk/portal';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ResponsiveService } from '@mm-services/responsive.service';

@Component({
  selector: 'mm-fast-action-button',
  templateUrl: './fast-action-button.component.html',
})
export class FastActionButtonComponent implements OnInit {

  @Input() contentComponent: ComponentType<any>;
  @Input() title: string;
  @ViewChild('contentWrapper') contentWrapper;
  componentPortal: Portal<any>;

  private bottomSheetRef: MatBottomSheetRef;
  private dialogRef: MatDialogRef<any>;

  constructor(
    private responsiveService: ResponsiveService,
    private matBottomSheet: MatBottomSheet,
    private matDialog: MatDialog,
  ) { }

  ngOnInit() {
    this.componentPortal = new ComponentPortal(this.contentComponent);
  }

  open() {
    this.closeAll();
    if (this.responsiveService.isMobile()) {
      this.bottomSheetRef = this.matBottomSheet.open(this.contentWrapper);
      return;
    }
    this.dialogRef = this.matDialog.open(this.contentWrapper);
  }

  closeAll() {
    this.bottomSheetRef?.dismiss();
    this.dialogRef?.close();
  }
}
