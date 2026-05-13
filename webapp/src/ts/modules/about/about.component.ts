import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

const constants = require('@medic/constants');
const DOC_IDS = constants.DOC_IDS;

import { DbService } from '@mm-services/db.service';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { Selectors } from '@mm-selectors/index';
import { SessionService } from '@mm-services/session.service';
import { VersionService } from '@mm-services/version.service';
import { TranslateService } from '@mm-services/translate.service';
import { BrowserDetectorService } from '@mm-services/browser-detector.service';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardSubtitle } from '@angular/material/card';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { NgIf, NgSwitch, NgSwitchCase, NgFor, DecimalPipe } from '@angular/common';
import { PartnerImagePipe } from '@mm-pipes/resource-icon.pipe';
import { SimpleDateTimePipe } from '@mm-pipes/date.pipe';

@Component({
  templateUrl: './about.component.html',
  imports: [
    ToolBarComponent,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    TranslateDirective,
    MatCardContent,
    MatButton,
    MatCardSubtitle,
    NgIf,
    NgSwitch,
    NgSwitchCase,
    NgFor,
    DecimalPipe,
    TranslatePipe,
    PartnerImagePipe,
    SimpleDateTimePipe
  ]
})
export class AboutComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();
  private dataUsageUpdate;
  browserSupport;

  userCtx;
  replicationStatus;
  partners;
  androidDataUsage;
  androidDeviceInfo;
  version;
  appVersion;
  versionMismatch = false;
  localRev;
  remoteRev;
  dbInfo;
  url;
  doorTimeout;
  knockCount = 0;

  constructor(
    private dbService: DbService,
    private store: Store,
    private resourceIconsService: ResourceIconsService,
    private sessionService: SessionService,
    private versionService: VersionService,
    private translateService: TranslateService,
    private browserDetectorService: BrowserDetectorService,
    private router: Router
  ) { }

  ngOnInit() {
    this.subscribeToStore();

    this.url = window.location.hostname;
    this.userCtx = this.sessionService.userCtx();

    this.getPartners();
    this.getVersionAndRevisions();

    this.getAndroidDataUsage();
    this.getAndroidDeviceInfo();
    this.getDbInfo();
    this.getBrowserSupport();
  }

  ngOnDestroy() {
    clearTimeout(this.doorTimeout);
    clearInterval(this.dataUsageUpdate);
    this.subscription.unsubscribe();
  }

  private subscribeToStore() {
    const subscription = this.store
      .select(Selectors.getReplicationStatus)
      .subscribe(replicationStatus => this.replicationStatus = replicationStatus);
    this.subscription.add(subscription);
  }

  private getPartners() {
    this.resourceIconsService
      .getDocResources(DOC_IDS.PARTNERS)
      .then(partners => this.partners = partners)
      .catch(error => {
        if (error.status !== 404) { // Partners doc is not compulsory.
          console.error('Error fetching "partners" doc', error);
        }
      });
  }

  private async getDeployVersion() {
    try {
      const { version, rev } = await this.versionService.getLocal();
      this.version = version;
      this.localRev = rev;
    } catch (error) {
      console.error('Could not access local version', error);
      this.version = await this.translateService.get('app.version.unknown');
    }
  }

  private async getRemoteVersion() {
    try {
      this.remoteRev = await this.versionService.getRemoteRev();
    } catch (error) {
      console.debug('Could not access remote ddoc rev', error);
      this.remoteRev = await this.translateService.get('app.version.unknown');
    }
  }

  private async getServiceWorkerVersion() {
    try {
      const { version } = await this.versionService.getServiceWorker();
      this.appVersion = version;
    } catch (error) {
      console.debug('Could not access service worker app version', error);
    }
  }

  private async getVersionAndRevisions() {
    this.appVersion = undefined;
    await Promise.all([
      this.getDeployVersion(),
      this.getRemoteVersion(),
      this.getServiceWorkerVersion(),
    ]);
    if (this.version && this.appVersion && this.version !== this.appVersion) {
      this.versionMismatch = true;
      const msg = `Version mismatch: deploy-info version (${this.version}) ` +
        `and service worker version (${this.appVersion}) are different.`;
      console.error(msg);
    } else {
      this.versionMismatch = false;
    }
  }

  private refreshAndroidDataUsage() {
    this.androidDataUsage = JSON.parse((<any>window).medicmobile_android.getDataUsage());
  }

  private getAndroidDataUsage() {
    if ((<any>window).medicmobile_android && typeof (<any>window).medicmobile_android.getDataUsage === 'function') {
      this.refreshAndroidDataUsage();
      this.dataUsageUpdate = setInterval(() => this.refreshAndroidDataUsage(), 2000);
    }
  }

  private getAndroidDeviceInfo() {
    if ((<any>window).medicmobile_android && typeof (<any>window).medicmobile_android.getDeviceInfo === 'function') {
      this.androidDeviceInfo = JSON.parse((<any>window).medicmobile_android.getDeviceInfo());
    }
  }

  private getDbInfo() {
    this.dbService
      .get()
      .info()
      .then(result => this.dbInfo = result)
      .catch(error => {
        console.error('Failed to fetch DB info', error);
      });
  }

  private getBrowserSupport() {
    const isUsingSupportedBrowser = this.browserDetectorService.isUsingSupportedBrowser();
    const isUsingChtAndroid = this.browserDetectorService.isUsingChtAndroid();
    const isUsingChtAndroidV1 = this.browserDetectorService.isUsingChtAndroidV1();

    let outdatedComponent;
    if (isUsingChtAndroid) {
      if (!isUsingChtAndroidV1) {
        outdatedComponent = 'chtAndroid';
      } else if (!isUsingSupportedBrowser) {
        outdatedComponent = 'webviewApk';
      }
    } else if (!isUsingSupportedBrowser) {
      outdatedComponent = 'browser';
    }

    this.browserSupport = {
      isUsingSupportedEnvironment: typeof outdatedComponent === 'undefined',
      outdatedComponent,
    };
  }

  reload() {
    window.location.reload();
  }

  secretDoor() {
    if (this.doorTimeout) {
      clearTimeout(this.doorTimeout);
    }

    if (this.knockCount++ >= 5) {
      this.router.navigate(['/testing']);
      return;
    }

    this.doorTimeout = setTimeout(() => this.knockCount = 0, 1000);
  }
}
