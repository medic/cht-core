import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthDirective } from '@admin-tool-directives/auth.directive';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, AuthDirective],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent { }
