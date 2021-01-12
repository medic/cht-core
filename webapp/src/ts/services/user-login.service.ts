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
   * @param {Object} data Data needed for login.
   */
  login(data): Promise<Object> {

    const url = '/' + this.location.dbName + '/login';

    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    console.debug('UserLogin', url, data.user);

    return this.http.post(url, data || {}, {headers}).toPromise();
  }
}
