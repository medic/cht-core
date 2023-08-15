import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class UpdatePasswordService {

  constructor(private http: HttpClient) { }

  /**
   * Uses the user api to store a new password
   *
   * Updates are in the style of the /api/v1/users/{username} service, see
   * its documentation for more details.
   *
   * @param      {string} username         The user you wish to update, without org.couchdb.user:
   * @param      {string} currentPassword  Password for Basic Auth
   * @param      {string} newPassword      Password to set
   */
  update(username, currentPassword, newPassword): Promise<Object> {
    const url = '/api/v1/users/' + username;
    const headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Basic ' + window.btoa(username + ':' + currentPassword)
    };
    const updates = { password: newPassword };
    return this.http.post(url, updates, { headers }).toPromise() as Promise<Object>;
  }
}
