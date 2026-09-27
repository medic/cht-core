import * as _ from 'lodash-es';
import { Injectable, Inject, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { defaultIfEmpty, lastValueFrom } from 'rxjs';
import { DOCUMENT } from '@angular/common';

import { DeviceKeyService } from '@mm-services/device-key.service';
import { LocationService } from '@mm-services/location.service';
import { USER_ROLES } from '@medic/constants';

const COOKIE_NAME = 'userCtx';
const ONLINE_ROLE = USER_ROLES.ONLINE;

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  userCtxCookieValue: any = null;
  httpOptions = { headers: new HttpHeaders({ Accept: 'application/json' }) };

  constructor(
    private cookieService: CookieService,
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
    private readonly location: LocationService,
    // Resolved when logging out rather than injected: DeviceKeyService depends on this service,
    // and asking for it here up front would be a cycle.
    private readonly injector: Injector
  ) {}

  navigateToLogin() {
    console.warn('User must reauthenticate');
    const params = new URLSearchParams();
    params.append('redirect', this.document.location.href);
    const userCtx = this.userCtx();
    const username = userCtx && userCtx.name;
    if (username) {
      params.append('username', username);
    }

    this.cookieService.delete(COOKIE_NAME, '/');
    this.userCtxCookieValue = undefined;
    this.document.location.href = `/${this.location.dbName}/login?${params.toString()}`;
  }

  logout() {
    return this.forgetDeviceKey()
      // defaultIfEmpty because lastValueFrom rejects on an observable that completes without
      // emitting, which is what a delete with no body does.
      .then(() => lastValueFrom(this.http.delete('/_session', this.httpOptions).pipe(defaultIfEmpty(null)))
        .catch(() => {
          // Set cookie to force login before using app
          this.cookieService.set('login', 'force', undefined, '/');
        }))
      .then(() => {
        this.navigateToLogin();
      });
  }

  /**
   * Drops this device's offline sync key, so signing in again registers a fresh one.
   *
   * A password change invalidates the server session on every device the user has, and drops the
   * keys the server held for all of them. Only the device that typed the new password knows it
   * happened; the rest are logged out and would otherwise come back believing their key was still
   * good, and be refused every time they sent anything. Signing in is what the design ties
   * re-registration to, and this is that boundary.
   */
  private forgetDeviceKey() {
    return this.injector.get(DeviceKeyService)
      .forget()
      .catch(err => {
        // Never block a logout: a key left behind is re-registered on the next successful sync.
        console.error('SessionService :: Error forgetting the device key', err);
      });
  }

  /**
   * Get the user context of the logged in user. This will return
   * null if the user is not logged in.
   */
  userCtx () {
    if (!this.userCtxCookieValue) {
      const cookieValue = this.cookieService.get(COOKIE_NAME);
      // An absent cookie is an expected state
      if (cookieValue) {
        try {
          this.userCtxCookieValue = JSON.parse(cookieValue);
        } catch (error) {
          console.error('Cookie parsing error', error);
          this.userCtxCookieValue = null;
        }
      }
    }

    return this.userCtxCookieValue;
  }

  private refreshUserCtx() {
    return this.http
      .get('/' + this.location.dbName + '/login/identity')
      .toPromise()
      .catch(this.logout);
  }

  public check() {
    if (!this.cookieService.check(COOKIE_NAME)) {
      this.navigateToLogin();
    }
  }

  init () {
    const userCtx = this.userCtx();
    if (!userCtx || !userCtx.name) {
      return this.logout();
    }

    return this.http
      .get<{ userCtx: { name: string; roles: string[] } }>('/_session', { responseType: 'json', ...this.httpOptions })
      .toPromise()
      .then(value => {
        const name = value && value.userCtx && value.userCtx.name;
        if (name !== userCtx.name) {
          // connected to the internet but server session is different. Awaited so a caller of
          // init() can know the logout finished: it clears key material before navigating away.
          return this.logout().then(() => false);
        }
        if (_.difference(userCtx.roles, value!.userCtx.roles).length ||
          _.difference(value!.userCtx.roles, userCtx.roles).length) {
          return this.refreshUserCtx().then(() => true);
        }
      })
      .catch(response => {
        if (response.status === 401) {
          // connected to the internet but no session on the server
          this.navigateToLogin();
        }
      });
  }

  hasRole(role, userCtx?) {
    userCtx = userCtx || this.userCtx();
    return !!(userCtx && userCtx.roles?.includes(role));
  }

  isAdmin(userCtx?) {
    return this.hasRole(USER_ROLES.COUCHDB_ADMIN, userCtx);
  }

  /**
   * Returns true if the logged in user is online only
   */
  isOnlineOnly(userCtx?) {
    return this.isAdmin(userCtx) || this.hasRole(ONLINE_ROLE, userCtx);
  }
}
