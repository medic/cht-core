import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { debounce as _debounce } from 'lodash-es';
import * as moment from 'moment';

import { ChangesService } from '@mm-services/changes.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TasksActions } from '@mm-actions/tasks';
import { Selectors } from '@mm-selectors/index';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TourService } from '@mm-services/tour.service';
import { GlobalActions } from '@mm-actions/global';

@Component({
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit, OnDestroy {
  constructor(
    private store:Store,
    private changesService:ChangesService,
    private contactTypesService:ContactTypesService,
    private rulesEngineService:RulesEngineService,
    private telemetryService:TelemetryService,
    private tourService:TourService,
    private route:ActivatedRoute,
  ) {
    this.tasksActions = new TasksActions(store);
    this.globalActions = new GlobalActions(store);
  }

  subscription = new Subscription();
  private tasksActions;
  private globalActions;

  tasksList;
  selectedTask;
  error;
  hasTasks;
  loading;
  tasksDisabled;

  private tasksLoaded;
  private debouncedReload;

  private subscribeToStore() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getTasksList),
      this.store.select(Selectors.getTasksLoaded),
      this.store.select(Selectors.getSelectedTask),
    ).subscribe(([
      tasksList,
      tasksLoaded,
      selectedTask,
    ]) => {
      this.tasksList = tasksList;
      this.tasksLoaded = tasksLoaded;
      this.selectedTask = selectedTask;
    });
    this.subscription.add(reduxSubscription);
  }

  private subscribeToChanges() {
    const isReport = doc => doc.type === 'data_record' && !!doc.form;
    const changesSubscription = this.changesService.subscribe({
      key: 'refresh-task-list',
      filter: change => !!change.doc && (
        this.contactTypesService.includes(change.doc) ||
        isReport(change.doc) ||
        change.doc.type === 'task'
      ),
      callback: () => {
        this.debouncedReload.cancel();
        return this.debouncedReload();
      },
    });
    this.subscription.add(changesSubscription);
  }

  private subscribeToRulesEngine() {
    const rulesEngineSubscription = this.rulesEngineService.contactsMarkedAsDirty(() => {
      this.debouncedReload.cancel();
      return this.debouncedReload();
    });
    this.subscription.add(rulesEngineSubscription);
  }

  ngOnInit() {
    this.tasksActions.setSelectedTask(null);
    this.subscribeToStore();
    this.subscribeToChanges();
    this.subscribeToRulesEngine();

    this.error = false;
    this.hasTasks = false;
    this.loading = true;
    this.debouncedReload = _debounce(this.refreshTasks.bind(this), 1000, { maxWait: 10 * 1000 });
    this.refreshTasks();

    this.tourService.startIfNeeded(this.route.snapshot);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();

    this.tasksActions.setTasksList([]);
    this.tasksActions.setTasksLoaded(false);
    this.globalActions.unsetSelected();
  }

  refreshTaskList() {
    window.location.reload();
  }

  private hydrateEmissions(taskDocs) {
    return taskDocs.map(taskDoc => {
      const emission = { ...taskDoc.emission };
      const dueDate = moment(emission.dueDate, 'YYYY-MM-DD');
      emission.date = new Date(dueDate.valueOf());
      emission.overdue = dueDate.isBefore(moment());

      return emission;
    });
  }

  private refreshTasks() {
    const telemetryData:any = {
      start: Date.now(),
    };

    return this.rulesEngineService
      .isEnabled()
      .then(isEnabled => {
        this.tasksDisabled = !isEnabled;
        return isEnabled ? this.rulesEngineService.fetchTaskDocsForAllContacts() : [];
      })
      .then(taskDocs => {
        this.hasTasks = taskDocs.length > 0;
        this.loading = false;
        this.tasksActions.setTasksList(this.hydrateEmissions(taskDocs));
        if (!this.tasksLoaded) {
          this.tasksActions.setTasksLoaded(true);
        }

        telemetryData.end = Date.now();
        const telemetryEntryName = !this.tasksLoaded ? `tasks:load`: `tasks:refresh`;
        this.telemetryService.record(telemetryEntryName, telemetryData.end - telemetryData.start);
      })
      .catch(err => {
        console.error('Error getting tasks for all contacts', err);

        this.error = true;
        this.loading = false;
        this.hasTasks = false;
        this.tasksActions.setTasksList([]);
      });
  }

  listTrackBy(index, task) {
    return task._id;
  }
}
