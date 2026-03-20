import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Handles all HTTP communication with the users API endpoint.
 * Credentials are sent automatically via the browser cookie on each request,
 * so no manual authentication headers are required.
 */
@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private http = inject(HttpClient);

  /**
   * Fetches the full list of users from the API.
   * The browser automatically attaches the session cookie via `withCredentials`.
   * @returns a promise that resolves to an array of user objects
   */
  async getUsers(): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>('/api/v2/users', { withCredentials: true })
    );
  }
}