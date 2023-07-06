import { Inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';

export const CAN_TRACK_USAGE_ANALYTICS = 'can_track_usage_analytics';

@Injectable({
  providedIn: 'root'
})
export class MatomoAnalyticsService {
  private window: any;
  private previousPageUrl: string;
  private isScriptReady = new Subject<boolean>();
  private matomoServer: string;

  private MATOMO_SCRIP_FILE = 'matomo.js';
  private MATOMO_TRACKER = 'matomo.php';

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private sessionService: SessionService,
    private authService: AuthService,
    private settingsService: SettingsService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.window = this.document.defaultView;
  }

  async init() {
    if (!(await this.canTrack()) || !this.window) {
      return;
    }

    if (!this.window._paq) {
      this.window._paq = [];
    }

    const isConfigOkay = await this.setMatomoConfig();
    if (!isConfigOkay) {
      return;
    }

    this.loadScript();
  }

  private async setMatomoConfig() {
    const settings = await this.settingsService.get();
    const siteId = settings?.usage_analytics?.webapp?.matomo_site_id;
    this.matomoServer = settings?.usage_analytics?.webapp?.matomo_server;

    if (!this.matomoServer || !siteId) {
      console.warn(`Matomo Analytics :: Missing configuration. Server URL: ${this.matomoServer} - Site ID: ${siteId}`);
      return false;
    }

    this.window._paq.push([MatomoConfig.TRACK_PAGE_VIEW]);
    this.window._paq.push([MatomoConfig.ENABLE_LINK_TRACKING]);
    this.window._paq.push([MatomoConfig.SET_TRACKER_URL, `${this.matomoServer}/${this.MATOMO_TRACKER}`]);
    this.window._paq.push([MatomoConfig.SET_SITE_ID, siteId]);

    return true;
  }

  private async canTrack() {
    return !this.sessionService.isDbAdmin() && await this.authService.has(CAN_TRACK_USAGE_ANALYTICS);
  }

  private loadScript() {
    const head = this.document.getElementsByTagName('head')[0];
    const script = this.document.createElement('script');

    script.type = 'text/javascript';
    script.async = true;
    script.src = `${this.matomoServer}/${this.MATOMO_SCRIP_FILE}`;

    this.isScriptReady.subscribe(isReady => isReady && this.startTracking());
    script.onload = () => this.isScriptReady.next(true);

    head.appendChild(script);
  }

  private startTracking() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        let currentRoute = this.activatedRoute.root;
        while (currentRoute?.firstChild) {
          currentRoute = currentRoute.firstChild;
        }

        if (this.previousPageUrl) {
          this.window._paq.push([MatomoConfig.SET_REFERENCE_URL, this.previousPageUrl]);
        }

        if (currentRoute.snapshot?.title) {
          this.window._paq.push([MatomoConfig.SET_DOCUMENT_TITLE, currentRoute.snapshot?.title]);
        }

        this.window._paq.push([MatomoConfig.SET_CUSTOM_URL, window.location.href]);
        this.previousPageUrl = window.location.href;

        this.window._paq.push([MatomoConfig.TRACK_PAGE_VIEW]); // Set last
        this.window._paq.push([MatomoConfig.ENABLE_LINK_TRACKING]); // Also, set last
      });
  }

  async trackEvent(category, action, name) {
    if (!(await this.canTrack()) || !this.window) {
      return;
    }

    this.window._paq.push([MatomoConfig.TRACK_EVENT, category, action, name]);
  }
}

export const EventActions = {
  LOAD: 'load',
  SEARCH: 'search',
  SORT: 'sort',
};

export const EventCategories = {
  CONTACTS: 'contacts',
  REPORTS: 'reports',
  TASKS: 'tasks'
};

export const MatomoConfig = {
  ENABLE_LINK_TRACKING: 'enableLinkTracking',
  SET_CUSTOM_URL: 'setCustomUrl',
  SET_DOCUMENT_TITLE: 'setDocumentTitle',
  SET_REFERENCE_URL: 'setReferrerUrl',
  SET_SITE_ID: 'setSiteId',
  SET_TRACKER_URL: 'setTrackerUrl',
  TRACK_EVENT: 'trackEvent',
  TRACK_PAGE_VIEW: 'trackPageView',
};
