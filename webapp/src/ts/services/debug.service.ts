/*
 * Manage debug mode.
 *
 * When enabled:
 *
 *   - persist setting to a cookie
 *   - put PouchDB in debug mode
 *   - display console.debug() output throughout the app (See Feedback Service).
 *
 * Note: When debugging, make sure to enable the logs by selecting 'verbose' and 'info' options
 * in the console of the browser's developer tools.
 */

import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class DebugService {
  private readonly cookieName = 'medic-webapp-debug';
  private isDebugEnabled = false;

  constructor(private cookieService: CookieService) {
    this.isDebugEnabled = !!this.cookieService.get(this.cookieName);
  }

  get() {
    return this.isDebugEnabled;
  }

  set(enableDebug:boolean) {
    const db = window.PouchDB;

    if (enableDebug) {
      db.debug.enable('*');
      this.cookieService.set(this.cookieName, enableDebug.toString(), 360, '/');
      this.isDebugEnabled = true;
      console.debug('Debug mode on');
      return;
    }

    db.debug.disable();
    this.cookieService.delete(this.cookieName, '/');
    this.isDebugEnabled = false;
    console.debug('Debug mode off');
  }
}
