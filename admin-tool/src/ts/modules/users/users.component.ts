import { Component } from '@angular/core';
import { UsersListComponent } from './ts/components/users-list/users-list.component';

/**
 * Entry point for the Users administration module.
 * Renders the users list view which requires `can_configure` permission to access.
 */
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [UsersListComponent],
  template: `<users-list></users-list>`,
})
export class UsersComponent {}
