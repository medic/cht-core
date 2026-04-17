import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * Service responsible for deleting a user via the CHT API.
 *
 * Wraps DELETE /api/v1/users/:username.
 */
@Injectable({
  providedIn: 'root',
})
export class DeleteUserService {
  constructor(private http: HttpClient) {}

  /**
   * Deletes a user by username.
   *
   * @param username - the username of the user to delete (without org.couchdb.user: prefix)
   */
  deleteUser(username: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`/api/v1/users/${username}`)
    );
  }
}
