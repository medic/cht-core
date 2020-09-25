import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class UpdateUserService {

  constructor(private http: HttpClient) { }

  /**
   * Uses the user api to store user updates.
   *
   * Updates are in the style of the /api/v1/users/{username} service, see
   * its documentation for more details.
   *
   * If you pass a username as password this will be used as Basic Auth to
   * the api (required for password updates). Otherwise it will use your
   * existing cookie.
   *
   * @param      {String}  username       The user you wish to update, without org.couchdb.user:
   * @param      {Object}  updates        Updates you wish to make
   * @param      {String}  basicAuthUser  Optional username for Basic Auth
   * @param      {String}  basicAuthPass  Optional password for Basic Auth
   */
  update(username, updates, basicAuthUser, basicAuthPass): Observable<Object> {
    const url = '/api/v1/users/' + username;

    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (basicAuthUser) {
      headers.Authorization = 'Basic ' + window.btoa(basicAuthUser + ':' + basicAuthPass);
    }

    console.debug('UpdateUser', url, updates);

    return this.http.post(url, updates || {}, {headers});
  }
}
