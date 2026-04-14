import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Handles HTTP communication with the create user API endpoint.
 * Uses POST /api/v3/users to create a single user.
 */
@Injectable({
  providedIn: 'root'
})
export class CreateUserService {

  constructor(private http: HttpClient) {}

  /**
   * Creates a new user in the system.
   * @param user object containing username, password, roles and optional fields
   * @returns a promise that resolves when the user is created successfully
   */
  async createUser(user: any): Promise<any> {
    return firstValueFrom(
      this.http.post('/api/v3/users', user, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
    );
  }
}
