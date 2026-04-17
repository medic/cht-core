import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DbService } from '@admin-tool-services/db.service';
import { User } from '@admin-tool-modules/users/users-interfaces';

/**
 * Handles fetching and updating users.
 * Exposes a shared observable to notify other components when the user list should be refreshed.
 *
 * Uses the medic-client/doc_by_type CouchDB view directly (same as the AngularJS app) so that
 * inactive (deleted) users are included in the list and shown as greyed out.
 * The API endpoints (v1/users, v2/users) do not return inactive users.
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

  constructor(private db: DbService) {}

  /**
   * Fetches the full list of users from the CouchDB view, including inactive (deleted) users.
   * Inactive users have `inactive: true` and are displayed as greyed out in the list.
   * @returns a promise that resolves to an array of user-settings documents
   */
  async getUsers(): Promise<Partial<User>[]> {
    const result = await this.db.get().query('medic-client/doc_by_type', {
      include_docs: true,
      key: ['user-settings'],
    });
    return result.rows
      .map((row: any) => row.doc)
      .filter(Boolean)
      .map((doc: any): Partial<User> => ({
        id: doc._id,
        username: doc.name,
        fullname: doc.fullname,
        email: doc.email,
        phone: doc.phone,
        facility_id: doc.facility_id,
        contact_id: doc.contact_id,
        roles: doc.roles,
        inactive: doc.inactive,
      }));
  }

  /**
   * Notifies all subscribers that the user list should be refreshed.
   * Called after a successful create, edit, or delete operation.
   */
  notifyUsersUpdated() {
    this.usersUpdatedSubject.next();
  }
}
