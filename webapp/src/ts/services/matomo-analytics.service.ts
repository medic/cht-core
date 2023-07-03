import { Inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MatomoAnalyticsService {
  private window: any;
  private previousPageUrl: string;
  private trackingSubscription: Subscription;
  private isScriptReady = new Subject<boolean>();

  private MATOMO_SERVER_URL = 'https://matomo-care-teams.dev.medicmobile.org';
  private MATOMO_SCRIP_FILE = 'matomo.js';
  private MATOMO_TRACKER = 'matomo.php';
  private MATOMO_SITE_ID = '1';

  constructor(
    private router: Router,
    private readonly activatedRoute: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.window = this.document.defaultView;
  }

  private loadScript() {
    const head = this.document.getElementsByTagName('head')[0];
    const script = this.document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
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

    this.window._paq.push(['trackPageView']); // TODO: extract to enum or something
    this.window._paq.push(['enableLinkTracking']);
    this.window._paq.push(['setTrackerUrl', `${this.MATOMO_SERVER_URL}/${this.MATOMO_TRACKER}`]);
    this.window._paq.push(['setSiteId', this.MATOMO_SITE_ID]);

    this.isScriptReady.subscribe(isReady => isReady && this.startTracking());
    this.loadScript();
  }

  stopTracking() { // TODO: Do we need this?
    this.trackingSubscription?.unsubscribe();
  }

  startTracking() {
    this.trackingSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        let currentRoute = this.activatedRoute.root;
        while (currentRoute?.firstChild) {
          currentRoute = currentRoute.firstChild;
        }

        if (this.previousPageUrl) {
          this.window._paq.push(['setReferrerUrl', this.previousPageUrl]);  // TODO: extract to enum or something
        }

        if (currentRoute.snapshot?.title) {
          this.window._paq.push(['setDocumentTitle', currentRoute.snapshot?.title]);
        }

        this.window._paq.push(['setCustomUrl', window.location.href]);
        this.previousPageUrl = window.location.href;
        this.window._paq.push(['trackPageView']); // Set last
        this.window._paq.push(['enableLinkTracking']); // Also, set last
      });
  }
}
