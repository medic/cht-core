import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import { Store, select } from '@ngrx/store';
import {combineLatest} from "rxjs";
import {TranslateService} from '@ngx-translate/core';
import {DbService} from "../../services/db.service";
import {ResourceIconsService} from "../../services/resource-icons.service";
import {Selectors} from "../../selectors";
import {SessionService} from "../../services/session.service";
import {VersionService} from "../../services/version.service";

@Component({
  templateUrl: './about.component.html'
})
export class AboutComponent implements OnInit, OnDestroy {
  private dataUsageUpdate;

  userCtx;
  replicationStatus;
  androidAppVersion;
  partners;
  androidDataUsage;
  version;
  localRev;
  remoteRev;
  dbInfo;
  url;

  constructor(
    private dbService: DbService,
    private store: Store,
    private resourceIconsService: ResourceIconsService,
    private sessionService: SessionService,
    private versionService: VersionService,
    private translateService: TranslateService,
  ) {
    combineLatest(
      this.store.pipe(select(Selectors.getReplicationStatus)),
      this.store.pipe(select(Selectors.getAndroidAppVersion)),
    ).subscribe(([ replicationStatus, androidAppVersion ]) => {
      this.replicationStatus = replicationStatus;
      this.androidAppVersion = androidAppVersion;
    });
  }

  ngOnInit() {
    this.userCtx = this.sessionService.userCtx();
    this.resourceIconsService.getDocResources('partners').then(partners => {
      this.partners = partners;
    });

    this.versionService
      .getLocal()
      .then(({ version, rev }) => {
        this.version = version;
        this.localRev = rev;
      })
      .catch((err) => {
        console.error('Could not access local version', err);
      });

    this.versionService
      .getRemoteRev()
      .catch((err) => {
        console.debug('Could not access remote ddoc rev', err);
        return this.translateService.get('app.version.unknown').toPromise();
      })
      .then(rev => this.remoteRev = rev);

    if ((<any>window).medicmobile_android && typeof (<any>window).medicmobile_android.getDataUsage === 'function') {
      this.updateAndroidDataUsage();
      this.dataUsageUpdate = setInterval(this.updateAndroidDataUsage, 2000);
    }

    this.dbService.get()
      .info()
      .then((result) => {
        this.dbInfo = result;
      })
      .catch((err) => {
        console.error('Failed to fetch DB info', err);
      });
  }

  ngOnDestroy() {
    clearInterval(this.dataUsageUpdate);
  }

  private updateAndroidDataUsage() {
    this.androidDataUsage = JSON.parse((<any>window).medicmobile_android.getDataUsage());
  }

  reload() {
    window.location.reload(false);
  };

  // todo testing!
  secretDoor() {

  }
}
/*
angular.module('inboxControllers').controller('AboutCtrl',
  function (
    $interval,
    $log,
    $ngRedux,
    $scope,
    $state,
    $timeout,
    $translate,
    $window,
    DB,
    ResourceIconsService,
    Selectors,
    SessionService,
    VersionService
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = state => ({
      androidAppVersion: Selectors.getAndroidAppVersion(state),
      replicationStatus: Selectors.getReplicationStatus(state)
    });

    const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);




    ctrl.knockCount = 0;
    ctrl.secretDoor = () => {
      if (ctrl.doorTimeout) {
        $timeout.cancel(ctrl.doorTimeout);
      }
      if (ctrl.knockCount++ >= 5) {
        $state.go('testing');
      } else {
        ctrl.doorTimeout = $timeout(() => {
          ctrl.knockCount = 0;
        }, 1000);
      }
    };






    $scope.$on('$destroy', unsubscribe);
  }
);
*/
