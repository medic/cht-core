import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@admin-tool-services/auth.service';
import { UsersService } from '@admin-tool-services/users.service';
import { User } from '@admin-tool-modules/users/users-interfaces';
import { CreateUserComponent } from '../create-user/create-user.component';
import { EditUserComponent } from '../edit-user/edit-user.component';
import { DeleteUserComponent } from '../delete-user/delete-user.component';

/**
 * Displays and manages the list of system users.
 * Requires `can_configure` permission to access.
 * Provides hooks for create, edit, and delete actions via modal components.
 */
@Component({
  selector: 'users-list',
  standalone: true,
  imports: [TranslatePipe, CreateUserComponent, EditUserComponent, DeleteUserComponent],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.less',
})
export class UsersListComponent implements OnInit, OnDestroy {
  canConfigure = false;
  loading = false;
  error = false;
  users: Partial<User>[] = [];

  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

  selectedUser: Partial<User> | null = null;

  private usersUpdatedSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  ngOnInit() {
    this.authService.has('can_configure').then((result) => {
      this.canConfigure = result;
      if (result) {
        this.loadUsers();
      }
    });

    this.usersUpdatedSubscription = this.usersService.usersUpdated$.subscribe(
      () => this.loadUsers()
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
    console.log('import users');
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
