import { Component } from '@angular/core';
import { UsersListComponent } from './ts/components/users-list/users-list.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [UsersListComponent],
  template: `<users-list></users-list>`,
})
export class UsersComponent {}