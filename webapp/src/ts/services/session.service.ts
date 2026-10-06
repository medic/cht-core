import * as _ from 'lodash-es';
import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { from, lastValueFrom, of, timeout } from 'rxjs';
import { DOCUMENT } from '@angular/common';

import { LocationService } from '@mm-services/location.service';
import { USER_ROLES } from '@medic/constants';

const COOKIE_NAME = 'userCtx';
// The longest the way out is allowed to wait on anything that wants to clean up. Signing out must
// reach the login page even if storage never answers.
const SESSION_END_TIMEOUT = 2000;
const ONLINE_ROLE = USER_ROLES.ONLINE;

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  userCtxCookieValue: any = null;
  httpOptions = { headers: new HttpHeaders({ Accept: 'application/json' }) };
  private readonly sessionEndHandlers: (() => Promise<void>)[] = [];

  constructor(
    private cookieService: CookieService,
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
    private location: LocationService
  ) {}

  /**
   * Runs the given work before the user is sent back to the login page, and waits for it.
   *
   * Listeners rather than a dependency, so this service does not have to know who cares that a
   * session is ending. Anything it could inject for that reaches back here through AuthService,
   * DBSyncService or DbService, which is a dependency cycle.
   */
  onSessionEnd(handler: () => Promise<void>) {
    this.sessionEndHandlers.push(handler);
  }

  async navigateToLogin() {
    console.warn('User must reauthenticate');
    const params = new URLSearchParams();
    params.append('redirect', this.document.location.href);
    const userCtx = this.userCtx();
    const username = userCtx && userCtx.name;
    if (username) {
      params.append('username', username);
    }

    // The cookie goes first. Ending the session can take up to its own bound, and leaving a valid
    // cookie in place for that long would mean the session outlives the decision to end it.
    this.cookieService.delete(COOKIE_NAME, '/');
    this.userCtxCookieValue = undefined;

    // Then the handlers, awaited BEFORE navigating so their work lands whether or not the caller
    // waits for this method. Here rather than in logout, because every path back to the login page
    // ends this session and several of them (an expired session, a 401) skip logout.
    await this.endSession();
    this.document.location.href = `/${this.location.dbName}/login?${params.toString()}`;
  }

  logout() {
    return lastValueFrom(this.http.delete('/_session', this.httpOptions))
      .catch(() => {
        // Set cookie to force login before using app
        this.cookieService.set('login', 'force', undefined, '/');
      })
      // returned, not just called: navigateToLogin now waits for the session to be ended before
      // it navigates, and a caller awaiting logout is entitled to that having happened.
      .then(() => this.navigateToLogin());
  }

  /**
   * A handler that fails must never leave the user on a page they have already been logged out of,
   * so each one is reported and then stepped over.
   */
  private endSession() {
    const handlers = Promise.all(this.sessionEndHandlers.map(
      // Through a resolved promise, so a handler that throws BEFORE returning one is caught here
      // too. Thrown straight out of the map it would reject this method before the navigation.
      handler => Promise.resolve()
        .then(handler)
        .catch(err => console.error('SessionService :: Error ending the session', err))
    ));
    // Bounded as well as caught. This runs on the way to the login page, including from a 401 and
    // from an expired session, where it used to be synchronous and could not fail. A handler that
    // never settles must not leave the user sitting on a page they are already signed out of.
    return lastValueFrom(from(handlers).pipe(timeout({ first: SESSION_END_TIMEOUT, with: () => of(undefined) })));
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
      return this.navigateToLogin();
    }
  }

  init () {
    const userCtx = this.userCtx();
    if (!userCtx?.name) {
      return this.logout();
    }

    return lastValueFrom(this.http
      .get<{ userCtx: { name: string; roles: string[] } }>('/_session', { responseType: 'json', ...this.httpOptions }))
      .then(async value => {
        const name = value?.userCtx?.name;
        if (name !== userCtx.name) {
          // connected to the internet but server session is different. Awaited so a caller of
          // init() can know the logout finished: it ends the session before navigating away.
          await this.logout();
          return undefined;
        }
        if (_.difference(userCtx.roles, value!.userCtx.roles).length ||
          _.difference(value!.userCtx.roles, userCtx.roles).length) {
          return this.refreshUserCtx().then(() => true);
        }
        return undefined;
      })
      .catch(response => {
        if (response.status === 401) {
          // connected to the internet but no session on the server
          return this.navigateToLogin();
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
