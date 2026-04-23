import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Handles HTTP communication with the create user API endpoints.
 * - POST /api/v3/users — creates a single user
 * - POST /api/v2/users — bulk imports users from a CSV string
 */
@Injectable({
  providedIn: 'root',
})
export class CreateUserService {
  constructor(private http: HttpClient) {}

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
      })
    );
  }

  /**
   * Bulk imports users from a CSV string.
   * Sends the raw CSV text to POST /api/v2/users.
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
      })
    );
  }
}
