import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@admin-tool-services/auth.service';
import { UsersService } from '@admin-tool-services/users.service';

@Component({
  selector: 'users-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.less'
})
export class UsersListComponent implements OnInit {

  private authService = inject(AuthService);
  private usersService = inject(UsersService);

  canConfigure = false;
  loading = false;
  error = false;
  users: any[] = [];

  ngOnInit() {
    this.authService.has('can_configure').then(result => {
      this.canConfigure = result;
      if (result) {
        this.loadUsers();
      }
    });
  }

private async loadUsers() {
  this.loading = true;
  try {
    this.users = await this.usersService.getUsers();
    console.log('usuarios:', this.users);
    console.log('primer usuario:', this.users[0]);
    console.log('keys del primer usuario:', Object.keys(this.users[0]));
  } catch (err) {
    this.error = true;
    console.error('Error cargando usuarios', err);
  } finally {
    this.loading = false;
  }
}
  addUser(): void {
    console.log('add user');
  }

  importUsers(): void {
    console.log('import users');
  }

  deleteUser(user: any, event: Event): void {
    event.stopPropagation();
    console.log('borrar', user);
  }

  editUser(user: any): void {
    console.log('editar', user);
  }
}