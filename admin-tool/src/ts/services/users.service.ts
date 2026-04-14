import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { User } from '@admin-tool-modules/users/users-interfaces';

/**
 * Handles all HTTP communication with the users API endpoints.
 * Exposes a shared observable to notify other components when the user list should be refreshed.
 * Credentials are sent automatically via the browser cookie on each request,
 * so no manual authentication headers are required.
 */
@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private usersUpdatedSubject = new BehaviorSubject<void>(undefined);

  /**
   * Observable that emits whenever the user list should be refreshed.
   * Components subscribe to this to react to create, edit, or delete events.
   */
  usersUpdated$ = this.usersUpdatedSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Fetches the full list of users from the API.
   * @returns a promise that resolves to an array of user objects
   */
  async getUsers(): Promise<Partial<User>[]> {
    return firstValueFrom(this.http.get<Partial<User>[]>('/api/v2/users'));
  }

  /**
   * Notifies all subscribers that the user list should be refreshed.
   * Called after a successful create, edit, or delete operation.
   */
  notifyUsersUpdated() {
    this.usersUpdatedSubject.next();
  }
}
