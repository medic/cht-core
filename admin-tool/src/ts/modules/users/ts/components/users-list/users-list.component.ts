import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '@admin-tool-services/auth.service';
import { UsersService } from '@admin-tool-services/users.service';
import { User } from '@admin-tool-modules/users/users-interfaces';
import { CreateUserComponent } from '../create-user/create-user.component';
/**
 * Displays and manages the list of system users.
 * Requires `can_configure` permission to access — unauthorized users see an error message.
 * Fetches users from the API on initialization and provides hooks for create, edit, and delete actions.
 */
@Component({
  selector: 'users-list',
  standalone: true,
  imports: [CommonModule, CreateUserComponent, TranslatePipe],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.less',
})
export class UsersListComponent implements OnInit, OnDestroy {
  canConfigure = false;
  loading = false;
  error = false;
  users: Partial<User>[] = [];
  showCreateModal = false;

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
      () => {
        this.loadUsers();
      },
    );
  }

  ngOnDestroy() {
    this.usersUpdatedSubscription?.unsubscribe();
  }

  /**
   * Fetches the full list of users from the API.
   * Sets `loading` during the request and `error` if the request fails.
   */
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

  /**
   * Handles row click events — opens the edit modal for active users.
   * Inactive users are ignored to prevent accidental edits on deleted accounts.
   * @param user the user object from the row that was clicked
   */
  onRowClick(user: Partial<User>) {
    if (!user.inactive) {
      this.editUser(user);
    }
  }

  /**
   * Opens the Add User modal.
   */
  addUser() {
    this.showCreateModal = true;
  }

  /**
   * Opens the Import Users modal for bulk CSV upload.
   * TODO: implement when the modal component is available.
   */
  importUsers() {
    console.log('import users');
  }

  /**
   * Opens the Delete User confirmation modal.
   * Stops event propagation to prevent triggering the row click handler.
   * TODO: implement when the modal component is available.
   * @param user the user to be deleted
   * @param event the DOM click event
   */
  deleteUser(user: Partial<User>, event: Event) {
    event.stopPropagation();
    console.log('delete user', user);
  }

  /**
   * Opens the Edit User modal for the given user.
   * TODO: implement when the modal component is available.
   * @param user the user to be edited
   */
  editUser(user: Partial<User>) {
    console.log('edit user', user);
  }
}
