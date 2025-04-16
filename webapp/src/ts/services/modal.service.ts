import { Injectable } from '@angular/core';
import { ComponentType } from '@angular/cdk/overlay';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';

import { ResponsiveService } from '@mm-services/responsive.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  private globalActions: GlobalActions;
  private direction;

  constructor(
    private matDialog: MatDialog,
    private store: Store,
    private responsiveService: ResponsiveService,
  ) {
    this.globalActions = new GlobalActions(this.store);
    this.store.select(Selectors.getDirection).subscribe(direction => {
      this.direction = direction;
    });
  }

  show(component: ComponentType<any>, config?: Record<string, any>): MatDialogRef<any> {
    const oldModalRef = this.matDialog.openDialogs.find(modal => {
      return modal.componentInstance?.constructor?.name === component.name;
    });

    if (oldModalRef) {
      // No duplicate modals
      return oldModalRef;
    }

    const isMobile = this.responsiveService.isMobile();
    this.closeOtherComponents(isMobile);

    return this.matDialog.open(component, {
      autoFocus: false,
      disableClose: true,
      closeOnNavigation: true,
      minWidth: isMobile ? '90vw' : '340px', // Give maximum space to date picker's calendar when in mobile.
      width: '600px',
      maxWidth: '90vw',
      minHeight: '100px',
      direction: this.direction,
      ...config,
    });
  }

  /**
   * Avoids multiple layers of elements to improve UX.
   */
  private closeOtherComponents(isMobile) {
    this.globalActions.closeSidebarMenu();
    if (isMobile) {
      this.globalActions.setSnackbarContent();
    }
  }
}
