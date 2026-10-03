import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { DeviceKeyService } from '@mm-services/device-key.service';
import { LocationService } from '@mm-services/location.service';

// The longest a login will wait on the key work before handing control back. The forget half is
// local and finishes well inside this; only the registration request can hang, and that is
// self-healing on the next start.
const RENEW_TIMEOUT = 5000;

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

    return lastValueFrom(this.http.post(url, data || {}, { headers }))
      .then(response => this.renewDeviceKey().then(() => response as Object))
      // Renewed whatever the login did. The only caller reaches here after the password was
      // already changed, so the server has dropped this device's key either way; and a successful
      // login answers with a redirect, which HttpClient surfaces as an error anyway.
      .catch(err => this.renewDeviceKey().then(() => {
        throw err;
      }));
  }

  /**
   * This runs after a password change, which is the one login that happens in place. The server
   * has just dropped every device key for the user, so whatever is cached here is dead.
   */
  private renewDeviceKey(): Promise<void> {
    const renewed = this.deviceKeyService.renew();
    // Bounded, because the caller is a modal that shows a spinner until this returns and the
    // password has already changed by now. HttpClient has no timeout of its own, so a socket that
    // accepts and never answers would otherwise leave that spinner up for good.
    const bailOut = new Promise<void>(resolve => setTimeout(resolve, RENEW_TIMEOUT));
    return Promise.race([renewed, bailOut]);
  }
}
