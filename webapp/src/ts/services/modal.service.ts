import { Injectable } from '@angular/core';
import { ComponentType } from '@angular/cdk/overlay';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  constructor(private matDialog: MatDialog) { }

  show(component: ComponentType<any>, config?:Record<string, any>): MatDialogRef<any> {
    this.matDialog.closeAll();
    return this.matDialog.open(component, {
      autoFocus: false,
      disableClose: true,
      minWidth: 300,
      minHeight: 150,
      ...config
    });
  }
}
