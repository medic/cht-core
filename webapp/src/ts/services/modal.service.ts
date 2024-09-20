import { Injectable } from '@angular/core';
import { ComponentType } from '@angular/cdk/overlay';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';

import { ResponsiveService } from '@mm-services/responsive.service';
import { GlobalActions } from '@mm-actions/global';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  private globalActions: GlobalActions;

  constructor(
    private matDialog: MatDialog,
    private store: Store,
    private responsiveService: ResponsiveService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  show(component: ComponentType<any>, config?: Record<string, any>): MatDialogRef<any> {
    const oldModalRef = this.matDialog.openDialogs.find(modal => {
      return modal.componentInstance?.constructor?.name === component.name;
    });

    if (oldModalRef) {
      // No duplicate modals
      return oldModalRef;
    }

    this.closeOtherComponents();
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

  /**
   * Avoids multiple layers of elements to improve UX.
   */
  private closeOtherComponents() {
    this.globalActions.closeSidebarMenu();
    this.globalActions.setSnackbarContent();
  }
}
