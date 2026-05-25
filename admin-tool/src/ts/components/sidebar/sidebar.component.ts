import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthDirective } from '@admin-tool-directives/auth.directive';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, AuthDirective, TranslatePipe],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent { }
