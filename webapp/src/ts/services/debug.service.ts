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
  readonly cookieName = 'medic-webapp-debug';

  constructor(private cookieService: CookieService) { }

  get() {
    return !!this.cookieService.get(this.cookieName);
  }

  set(bool:boolean) {
    const db = window.PouchDB;

    if (bool) {
      db.debug.enable('*');
      this.cookieService.set(this.cookieName, bool.toString(), 360, '/');
      console.debug('Debug mode on');
      return;
    }

    db.debug.disable();
    this.cookieService.delete(this.cookieName, '/');
    console.debug('Debug mode off');
  }
}
