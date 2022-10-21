const COOKIE_NAME = 'userCtx';
const ONLINE_ROLE = 'mm-online';
import * as _ from 'lodash-es';
import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { DOCUMENT } from '@angular/common';

import { LocationService } from '@mm-services/location.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  userCtxCookieValue = null
  httpOptions = { headers: new HttpHeaders({ Accept:  'application/json' }) };

  constructor(
    private cookieService: CookieService,
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
    private location: LocationService) {
  }

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
    return this.http
      .delete('/_session', this.httpOptions)
      .toPromise()
      .catch(() => {
        // Set cookie to force login before using app
        this.cookieService.set('login', 'force', undefined, '/');
      })
      .then(() => {
        this.navigateToLogin();
      });
  }

  /**
   * Get the user context of the logged in user. This will return
   * null if the user is not logged in.
   */
  userCtx () {
    if (!this.userCtxCookieValue) {
      try {
        this.userCtxCookieValue = JSON.parse(this.cookieService.get(COOKIE_NAME));
      } catch(error) {
        console.error('Cookie parsing error', error);
        this.userCtxCookieValue = null;
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
      .get<{ userCtx: { name:string; roles:string[] } }>('/_session', { responseType: 'json', ...this.httpOptions })
      .toPromise()
      .then(value => {
        const name = value && value.userCtx && value.userCtx.name;
        if (name !== userCtx.name) {
          // connected to the internet but server session is different
          this.logout();
          return;
        }
        if (_.difference(userCtx.roles, value.userCtx.roles).length ||
          _.difference(value.userCtx.roles, userCtx.roles).length) {
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

  private hasRole (userCtx, role) {
    return !!(userCtx && userCtx.roles && userCtx.roles.includes(role));
  }

  isAdmin(userCtx?) {
    userCtx = userCtx || this.userCtx();
    return this.isDbAdmin(userCtx) ||
      this.hasRole(userCtx, 'national_admin'); // deprecated: kept for backwards compatibility: #4525
  }

  isDbAdmin(userCtx?) {
    userCtx = userCtx || this.userCtx();
    return this.hasRole(userCtx, '_admin');
  }

  /**
   * Returns true if the logged in user is online only
   */
  isOnlineOnly(userCtx?) {
    userCtx = userCtx || this.userCtx();
    return this.isAdmin(userCtx) || this.hasRole(userCtx, ONLINE_ROLE);
  }
}
