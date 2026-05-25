import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { DbService } from '@admin-tool-services/db.service';
import { User } from '@admin-tool-modules/users/users-interfaces';

/**
 * Handles all user-related HTTP communication and state management.
 *
 * - Fetches users from the CouchDB view directly so inactive users are included
 * - Exposes a shared observable to notify components when the user list should refresh
 * - Wraps POST /api/v3/users (create single), POST /api/v2/users (bulk CSV import),
 *   POST /api/v1/users/:username (update) and DELETE /api/v1/users/:username (delete)
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

  constructor(
    private db: DbService,
    private http: HttpClient,
  ) {}

  /**
   * Fetches the full list of users from the CouchDB view, including inactive (deleted) users.
   * Inactive users have `inactive: true` and are displayed as greyed out in the list.
   */
  async getUsers(): Promise<Partial<User>[]> {
    const result = await this.db.get().query('medic-client/doc_by_type', {
      include_docs: true,
      key: ['user-settings'],
    });
    return result.rows
      .map((row: any) => row.doc)
      .filter(Boolean)
      .map(
        (doc: any): Partial<User> => ({
          id: doc._id,
          username: doc.name,
          fullname: doc.fullname,
          email: doc.email,
          phone: doc.phone,
          facility_id: doc.facility_id,
          contact_id: doc.contact_id,
          roles: doc.roles,
          inactive: doc.inactive,
        }),
      );
  }

  /**
   * Creates a new user in the system.
   * @param user object containing username, password, roles and optional fields
   */
  async createUser(user: any): Promise<any> {
    return firstValueFrom(
      this.http.post('/api/v3/users', user, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }),
    );
  }

  /**
   * Bulk imports users from a CSV string.
   * @param csv raw CSV string
   */
  async createMultipleUsers(csv: string): Promise<any> {
    return firstValueFrom(
      this.http.post('/api/v2/users', csv, {
        withCredentials: true,
        headers: {
          'Content-Type': 'text/csv',
          Accept: 'application/json',
        },
      }),
    );
  }

  /**
   * Sends a partial update for an existing user.
   * @param username the username of the user to update (without org.couchdb.user: prefix)
   * @param updates the fields to update
   */
  updateUser(username: string, updates: Record<string, any>): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`/api/v1/users/${username}`, updates),
    );
  }

  /**
   * Deletes a user by username.
   * @param username the username of the user to delete (without org.couchdb.user: prefix)
   */
  deleteUser(username: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/v1/users/${username}`));
  }

  /**
   * Notifies all subscribers that the user list should be refreshed.
   * Called after a successful create, edit, or delete operation.
   */
  notifyUsersUpdated() {
    this.usersUpdatedSubject.next();
  }
}
