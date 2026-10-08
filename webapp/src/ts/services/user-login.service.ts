import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { DeviceKeyService } from '@mm-services/device-key.service';
import { LocationService } from '@mm-services/location.service';

@Injectable({
  providedIn: 'root'
})
export class UserLoginService {

  constructor(
    private readonly http: HttpClient,
    private readonly location: LocationService,
    private readonly deviceKeyService: DeviceKeyService
  ) { }

  /**
   * Calls back-end Login service.
   *
   * @param {String} username username of the user to be logged in.
   * @param {String} password password of the user.
   */
  login(username: string, password: string): Promise<Object> {

    const url = '/' + this.location.dbName + '/login';

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    const data = JSON.stringify({
      user: username,
      password: password,
      redirect: '',
      locale: ''
    });

    console.debug('UserLogin', url, username);

    const login = lastValueFrom(this.http.post(url, data || {}, { headers }));
    login.then(() => this.renewDeviceKey(), () => this.renewDeviceKey());
    return login;
  }

  private renewDeviceKey() {
    this.deviceKeyService
      .clearDeviceKeys()
      .then(() => this.deviceKeyService.registerIfPermitted())
      .catch(err => console.error('UserLogin :: Error renewing the device key', err));
  }
}
