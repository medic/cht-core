import { Component, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NavigationComponent } from '../navigation/navigation.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'mm-tool-bar',
    templateUrl: './tool-bar.component.html',
    standalone: true,
    imports: [MatIconButton, MatIcon, NavigationComponent, TranslatePipe]
})
export class ToolBarComponent {
  private globalActions: GlobalActions;
  @Input() title: string = '';

  constructor(
    private store: Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  openMenu() {
    this.globalActions.openSidebarMenu();
  }
}
