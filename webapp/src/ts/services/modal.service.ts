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
    this.matDialog.closeAll();
    const isMobile = this.responsiveService.isMobile();

    return this.matDialog.open(component, {
      autoFocus: false,
      disableClose: true,
      maxWidth: '90vw',
      minWidth: isMobile ? '90vw' : 500, // Give maximum space to date picker's calendar when in mobile.
      minHeight: 100,
      ...config
    });
  }
}
