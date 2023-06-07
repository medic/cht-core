import { Component, OnInit } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { CookieService } from 'ngx-cookie-service';

import * as Purger from '../../../js/bootstrapper/purger';
import { DebugService } from '@mm-services/debug.service';
import { DbService } from '@mm-services/db.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { SessionService } from '@mm-services/session.service';

@Component({
  templateUrl: './testing.component.html',
})
export class TestingComponent implements OnInit {
  amountFeedbackDocs:any = 5000;
  debugEnabled = false;
  purging = false;
  generatingFeedback = false;
  wiping = false;

  constructor(
    private dbService: DbService,
    private debugService: DebugService,
    private feedbackService: FeedbackService,
    private sessionService: SessionService,
    private cookieService: CookieService,
  ) { }

  ngOnInit(): void {
    this.debugEnabled = this.debugService.get();
  }

  private setDebug(val) {
    this.debugService.set(val);
    this.debugEnabled = val;
  }

  private wipeLocalStorage() {
    window.localStorage.clear();
    return Promise.resolve();
  }

  private wipeServiceWorkers() {
    if (window.navigator?.serviceWorker) {
      return window.navigator.serviceWorker
        .getRegistrations()
        .then(registrations => {
          registrations?.forEach(registration => registration.unregister());
        });
    }

    return Promise.resolve();
  }

  private wipeDatabases() {
    return Promise
      .all([
        this.dbService.get({ remote: false }).destroy(),
        this.dbService.get({ remote: false, meta: true }).destroy()
      ])
      .catch(err => console.error('Error wiping databases', err));
  }

  private wipeCookies() {
    this.cookieService.deleteAll('/');

    return Promise.resolve();
  }

  enableDebug() {
    this.setDebug(true);
  }

  disableDebug() {
    this.setDebug(false);
  }

  generateFeedback() {
    if (isNaN(this.amountFeedbackDocs)) {
      console.error('Incorrect number of feedback docs', this.amountFeedbackDocs);
      return;
    }

    this.generatingFeedback = true;
    let promise = Promise.resolve();

    for (let i = 0; i < parseInt(this.amountFeedbackDocs); i++) {
      promise = promise.then(() => this.feedbackService.submit(uuid()));
    }

    promise.then(() => this.generatingFeedback = false);
  }

  wipe() {
    this.wiping = true;

    Promise
      .all([
        this.wipeLocalStorage(),
        this.wipeServiceWorkers(),
        this.wipeDatabases(),
        this.wipeCookies()
      ])
      .then(() => {
        this.wiping = false;
        this.sessionService.logout();
      });
  }
}
