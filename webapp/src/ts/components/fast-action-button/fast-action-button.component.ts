import { Component, OnInit, ViewChild, Input, Injector, InjectionToken } from '@angular/core';
import { ComponentPortal, ComponentType, Portal } from '@angular/cdk/portal';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ResponsiveService } from '@mm-services/responsive.service';

export const DATA_INJECTION_TOKEN = new InjectionToken<string>('DATA_INJECTION_TOKEN');

@Component({
  selector: 'mm-fast-action-button',
  templateUrl: './fast-action-button.component.html',
})
export class FastActionButtonComponent implements OnInit {

  @Input() contentComponent: ComponentType<any>;
  @Input() contentData: any;
  @Input() title: string;
  @Input() buttonStyle: Record<string, any>;
  @ViewChild('contentWrapper') contentWrapper;

  private bottomSheetRef: MatBottomSheetRef;
  private dialogRef: MatDialogRef<any>;

  componentPortal: Portal<any>;

  constructor(
    private responsiveService: ResponsiveService,
    private matBottomSheet: MatBottomSheet,
    private matDialog: MatDialog,
  ) { }

  ngOnInit() {
    this.componentPortal = new ComponentPortal(
      this.contentComponent,
      null,
      Injector.create({
        providers: [{ provide: DATA_INJECTION_TOKEN, useValue: this.contentData }],
      }),);
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
