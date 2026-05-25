import { AuthDirective } from '@admin-tool-directives/auth.directive';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Layout component for the Authorization section of the admin tool.
 * Renders the navigation tabs (Roles, Permissions) and the router-outlet
 * where child routes are loaded.
 *
 * Access to this component is restricted to users with the can_configure
 * permission, enforced by the authGuard in authorization.routes.ts.
 */
@Component({
  selector: 'authorization-header',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AuthDirective, TranslatePipe],
  templateUrl: './authorization-header.component.html',
  styleUrl: './authorization-header.component.less',
})
export class AuthorizationHeaderComponent {}
