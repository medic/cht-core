import { Injectable } from '@angular/core';
import { ComponentType } from '@angular/cdk/overlay';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ResponsiveService } from '@mm-services/responsive.service';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  constructor(
    private matDialog: MatDialog,
    private responsiveService: ResponsiveService,
  ) { }

  show(component: ComponentType<any>, config?:Record<string, any>): MatDialogRef<any> {
    const oldModalRef = this.matDialog.openDialogs.find(modal => {
      return modal.componentInstance?.constructor?.name === component.name;
    });

    if (oldModalRef) {
      // No duplicate modals
      return oldModalRef;
    }

    const isMobile = this.responsiveService.isMobile();

    return this.matDialog.open(component, {
      autoFocus: false,
      disableClose: true,
      minWidth: isMobile ? '90vw' : '400px', // Give maximum space to date picker's calendar when in mobile.
      width: '600px',
      maxWidth: '90vw',
      minHeight: '100px',
      ...config,
    });
  }
}
