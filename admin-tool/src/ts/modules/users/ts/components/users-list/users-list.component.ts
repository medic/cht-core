import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { UsersService } from '@admin-tool-services/users.service';
import { User } from '@admin-tool-modules/users/users-interfaces';
import { CreateUserComponent } from '../create-user/create-user.component';
import { EditUserComponent } from '../edit-user/edit-user.component';
import { DeleteUserComponent } from '../delete-user/delete-user.component';
import { ImportUsersComponent } from '../import-users/import-users.component';

/**
 * Displays and manages the list of system users.
 * Access is controlled by the route guard (can_configure permission).
 * Provides hooks for create, edit, delete and bulk import actions via modal components.
 */
@Component({
  selector: 'users-list',
  standalone: true,
  imports: [
    TranslatePipe,
    CreateUserComponent,
    EditUserComponent,
    DeleteUserComponent,
    ImportUsersComponent,
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.less',
})
export class UsersListComponent implements OnInit, OnDestroy {
  loading = false;
  error = false;
  users: Partial<User>[] = [];

  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showImportModal = false;

  selectedUser: Partial<User> | null = null;

  private usersUpdatedSubscription!: Subscription;

  constructor(private usersService: UsersService) {}

  async ngOnInit() {
    await this.loadUsers();
    this.usersUpdatedSubscription = this.usersService.usersUpdated$.subscribe(
      () => this.loadUsers(),
    );
  }

  ngOnDestroy() {
    this.usersUpdatedSubscription?.unsubscribe();
  }

  private async loadUsers() {
    this.loading = true;
    try {
      this.users = await this.usersService.getUsers();
    } catch (err) {
      this.error = true;
      console.error('Error fetching users', err);
    } finally {
      this.loading = false;
    }
  }

  onRowClick(user: Partial<User>) {
    if (!user.inactive) {
      this.editUser(user);
    }
  }

  addUser() {
    this.showCreateModal = true;
  }

  importUsers() {
    this.showImportModal = true;
  }

  editUser(user: Partial<User>) {
    this.selectedUser = user;
    this.showEditModal = true;
  }

  deleteUser(user: Partial<User>, event: Event) {
    event.stopPropagation();
    this.selectedUser = user;
    this.showDeleteModal = true;
  }
}
