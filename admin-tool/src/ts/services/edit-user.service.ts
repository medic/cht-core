import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * Service responsible for updating an existing user via the CHT API.
 *
 * Wraps POST /api/v1/users/:username — only the fields that have changed
 * need to be included in the updates payload.
 */
@Injectable({
  providedIn: 'root',
})
export class EditUserService {
  constructor(private http: HttpClient) {}

  /**
   * Sends a partial update for an existing user.
   *
   * @param username - the username of the user to update (without org.couchdb.user: prefix)
   * @param updates - the fields to update
   */
  updateUser(username: string, updates: Record<string, any>): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`/api/v1/users/${username}`, updates)
    );
  }
}
