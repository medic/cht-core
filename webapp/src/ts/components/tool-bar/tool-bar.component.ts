import { Component, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';

@Component({
  selector: 'mm-tool-bar',
  templateUrl: './tool-bar.component.html'
})
export class ToolBarComponent {
  private globalActions: GlobalActions;
  @Input() title?: string;
  @Input() cssClasses?: string[];

  constructor(
    private store: Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  openMenu() {
    this.globalActions.openSidebarMenu();
  }
}
