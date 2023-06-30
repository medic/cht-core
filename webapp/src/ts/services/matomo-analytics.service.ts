import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MatomoAnalyticsService {
  private window;
  private isScriptReady = new Subject<boolean>();
  private MATOMO_SERVER_URL = 'https://matomo-care-teams.dev.medicmobile.org';
  private MATOMO_SCRIP_FILE = 'matomo.js';
  private MATOMO_TRACKER = 'matomo.php';
  private MATOMO_SITE_ID = '1';

  constructor(
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.window = this.document.defaultView;
  }

  private loadScript() {
    const head = this.document.getElementsByTagName('head')[0];
    const script = this.document.createElement('script');
    script.type = 'text/javascript';
    script.src = `${this.MATOMO_SERVER_URL}/${this.MATOMO_SCRIP_FILE}`;
    script.onload = () => this.isScriptReady.next(true);
    head.appendChild(script);
  }

  init() {
    if (!this.window) {
      return;
    }

    if (!this.window._paq) {
      this.window._paq = [];
    }

    this.window._paq.push(['trackPageView']);
    this.window._paq.push(['enableLinkTracking']);
    this.window._paq.push(['setTrackerUrl', `${this.MATOMO_SERVER_URL}/${this.MATOMO_TRACKER}`]);
    this.window._paq.push(['setSiteId', this.MATOMO_SITE_ID]);
    this.loadScript();
  }
}
