import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocationService } from '@mm-services/location.service';

@Injectable({
  providedIn: 'root'
})
export class UserLoginService {

  constructor(
    private http: HttpClient,
    private location: LocationService) { }

  /**
   * Calls back-end Login service. 
   *
   * @param {String} username username of the user to be logged in.
   * @param {String} password password of the user.
   */
  login(username, password): Promise<Object> {

    const url = '/' + this.location.dbName + '/login';

    const headers: any = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const data = JSON.stringify({
      user: username,
      password: password,
      redirect: '',
      locale: ''
    });

    console.debug('UserLogin', url, username);

    return this.http.post(url, data || {}, {headers}).toPromise();
  }
}
