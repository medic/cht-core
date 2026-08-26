import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { TranslateService } from '@mm-services/translate.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { getDistanceInMeters } from '@mm-services/contact-geolocation.service';
import { MapComponent, MapMarker } from '@mm-components/map/map.component';

const METERS_PER_KM = 1000;

@Component({
  templateUrl: './tasks-map.component.html',
  imports: [MapComponent, TranslatePipe],
})
export class TasksMapComponent implements OnInit, OnDestroy {
  private globalActions;
  private geoHandle;
  private tasks: any[] = [];
  subscription = new Subscription();

  tasksLoaded = false;
  markers: MapMarker[] = [];
  tasksWithoutLocation = 0;
  userLocation;

  constructor(
    private store: Store,
    private router: Router,
    private translateService: TranslateService,
    private geolocationService: GeolocationService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.globalActions.setShowContent(true);
    this.globalActions.setTitle(this.translateService.instant('tasks.map.title'));
    this.subscribeToStore();
    void this.locateUser();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.geoHandle?.cancel();
    this.globalActions.setShowContent(false);
  }

  private subscribeToStore() {
    const storeSubscription = combineLatest([
      this.store.select(Selectors.getTasksLoaded),
      this.store.select(Selectors.getFilteredTasksList),
    ]).subscribe(([tasksLoaded, tasksList]) => {
      this.tasksLoaded = tasksLoaded;
      this.tasks = tasksList || [];
      this.setMarkers();
    });
    this.subscription.add(storeSubscription);
  }

  // distances are a nice-to-have: any geolocation failure just leaves them off the labels
  private async locateUser() {
    this.geoHandle = this.geolocationService.init();
    const position = await this.geolocationService.currentPromise;
    if (position?.code) {
      return;
    }
    this.userLocation = position;
    this.setMarkers();
  }

  private setMarkers() {
    const tasksWithLocation = this.tasks.filter(task => task.geolocation);
    this.tasksWithoutLocation = this.tasks.length - tasksWithLocation.length;
    this.markers = tasksWithLocation.map(task => ({
      geolocation: task.geolocation,
      label: [task.contact?.name, task.title].filter(Boolean).join(' - '),
      badge: this.getDistanceBadge(task),
      className: task.overdue ? 'overdue' : undefined,
      data: task,
    }));
  }

  private getDistanceBadge(task) {
    if (!this.userLocation) {
      return undefined;
    }
    return this.formatDistance(getDistanceInMeters(this.userLocation, task.geolocation));
  }

  private formatDistance(meters: number) {
    if (meters < METERS_PER_KM) {
      return this.translateService.instant('tasks.map.distance.m', { DISTANCE: Math.round(meters) });
    }
    const km = meters / METERS_PER_KM;
    const distance = km < 10 ? km.toFixed(1) : Math.round(km);
    return this.translateService.instant('tasks.map.distance.km', { DISTANCE: distance });
  }

  onMarkerClick(marker: MapMarker) {
    return this.router.navigate(['/tasks', marker.data._id]);
  }
}
