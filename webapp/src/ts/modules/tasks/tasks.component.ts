import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { debounce as _debounce, map as _map, find as _find } from 'lodash-es';
import * as moment from 'moment';

import { ChangesService } from '@mm-services/changes.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TasksActions } from '@mm-actions/tasks';
import { Selectors } from '@mm-selectors/index';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TourService } from '@mm-services/tour.service';
import { GlobalActions } from '@mm-actions/global';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { SessionService } from '@mm-services/session.service';

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
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private userContactService:UserContactService,
    private sessionService:SessionService,
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
  currentLevel;

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
    if (!this.sessionService.isOnlineOnly()) {
      this
        .getCurrentLineageLevel()
        .then((currentLevel) => {
          this.currentLevel = currentLevel;
        });
    }
    this.refreshTasks();

    this.tourService.startIfNeeded(this.route.snapshot);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();

    this.tasksActions.setTasksList([]);
    this.tasksActions.setTasksLoaded(false);
    this.tasksActions.setSelectedTask(null);
    this.globalActions.unsetSelected();
    this.tasksActions.clearTaskGroup();
  }

  refreshTaskList() {
    window.location.reload();
  }

  private async hydrateEmissions(taskDocs) {
    return taskDocs.map(taskDoc => {
      const emission = { ...taskDoc.emission };
      const dueDate = moment(emission.dueDate, 'YYYY-MM-DD');
      emission.date = new Date(dueDate.valueOf());
      emission.moment = moment();
      emission.overdue = dueDate.isBefore(moment());
      emission.owner = taskDoc.owner;

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
        this.hydrateEmissions(taskDocs)
          .then((tasks) => {
            // get lineages for all tasks
            this.getLineagesFromTaskDocs(tasks)
              .then((subjects) => {
                const deepCopy = obj => JSON.parse(JSON.stringify(obj));
                const lineagedTasks = deepCopy(tasks);
                lineagedTasks?.forEach((task) => {
                  // map tasks with lineages
                  let lineage = _map(_find(subjects, subject => subject._id === task.forId)?.lineage, 'name');
                  // remove the lineage level that belongs to the offline logged-in user, normally the last one
                  if (lineage && lineage.length) {
                    if(this.currentLevel){
                      lineage = lineage.filter(level => level && level !== this.currentLevel);
                    }
                    task.lineage = lineage;
                  }
                });
                this.tasksActions.setTasksList(lineagedTasks);
              });
          });

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
    return task?._id;
  }

  async getCurrentLineageLevel(){
    return this.userContactService.get().then(user => user?.parent?.name);
  }

  async getLineagesFromTaskDocs(taskDocs){
    const ids = _map(taskDocs, 'forId');
    return await this.lineageModelGeneratorService.reportSubjects(ids);
  }
}
