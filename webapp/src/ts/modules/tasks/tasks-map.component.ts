import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { TranslateService } from '@mm-services/translate.service';
import { MapComponent, MapMarker } from '@mm-components/map/map.component';

@Component({
  templateUrl: './tasks-map.component.html',
  imports: [MapComponent, TranslatePipe],
})
export class TasksMapComponent implements OnInit, OnDestroy {
  private globalActions;
  subscription = new Subscription();

  tasksLoaded = false;
  markers: MapMarker[] = [];
  tasksWithoutLocation = 0;

  constructor(
    private store: Store,
    private router: Router,
    private translateService: TranslateService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.globalActions.setShowContent(true);
    this.globalActions.setTitle(this.translateService.instant('tasks.map.title'));
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.globalActions.setShowContent(false);
  }

  private subscribeToStore() {
    const storeSubscription = combineLatest([
      this.store.select(Selectors.getTasksLoaded),
      this.store.select(Selectors.getFilteredTasksList),
    ]).subscribe(([tasksLoaded, tasksList]) => {
      this.tasksLoaded = tasksLoaded;
      this.setMarkers(tasksList || []);
    });
    this.subscription.add(storeSubscription);
  }

  private setMarkers(tasks) {
    const tasksWithLocation = tasks.filter(task => task.geolocation);
    this.tasksWithoutLocation = tasks.length - tasksWithLocation.length;
    this.markers = tasksWithLocation.map(task => ({
      geolocation: task.geolocation,
      label: [task.contact?.name, task.title].filter(Boolean).join(' - '),
      className: task.overdue ? 'overdue' : undefined,
      data: task,
    }));
  }

  onMarkerClick(marker: MapMarker) {
    return this.router.navigate(['/tasks', marker.data._id]);
  }
}
