import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DeleteUserService } from '@admin-tool-services/delete-user.service';
import { UsersService } from '@admin-tool-services/users.service';
import { User } from '@admin-tool-modules/users/users-interfaces';

/**
 * Confirmation modal for deleting a user.
 * Controlled by the parent via the `visible` input and `user` input.
 * Emits `closed` when dismissed and `userDeleted` on successful deletion.
 */
@Component({
  selector: 'delete-user',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './delete-user.component.html',
  styleUrl: './delete-user.component.less',
})
export class DeleteUserComponent {
  @Input() visible = false;
  @Input() user: User | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() userDeleted = new EventEmitter<void>();

  loading = false;
  error: string | null = null;

  constructor(
    private deleteUserService: DeleteUserService,
    private usersService: UsersService,
  ) {}

  cancel() {
    this.error = null;
    this.closed.emit();
  }

  async confirm() {
    if (!this.user?.username) {
      return;
    }

    this.loading = true;
    this.error = null;
    try {
      await this.deleteUserService.deleteUser(this.user.username);
      this.usersService.notifyUsersUpdated();
      this.userDeleted.emit();
      this.closed.emit();
    } catch (err: any) {
      this.error = err?.error?.message || 'Error deleting document';
    } finally {
      this.loading = false;
    }
  }
}
