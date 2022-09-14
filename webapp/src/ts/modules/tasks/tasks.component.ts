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
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { SessionService } from '@mm-services/session.service';

@Component({
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit, OnDestroy {
  constructor(
    private store: Store,
    private changesService: ChangesService,
    private contactTypesService: ContactTypesService,
    private rulesEngineService: RulesEngineService,
    private telemetryService: TelemetryService,
    private tourService: TourService,
    private route: ActivatedRoute,
    private lineageModelGeneratorService: LineageModelGeneratorService,
    private userContactService: UserContactService,
    private sessionService: SessionService,
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
    this.debouncedReload = _debounce(this.refreshTasks.bind(this), 1000, {maxWait: 10 * 1000});

    this.currentLevel = this.sessionService.isOnlineOnly() ? Promise.resolve() : this.getCurrentLineageLevel();

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

  private hydrateEmissions(taskDocs) {
    return taskDocs.map(taskDoc => {
      const emission = {...taskDoc.emission};
      const dueDate = moment(emission.dueDate, 'YYYY-MM-DD');
      emission.date = new Date(dueDate.valueOf());
      emission.overdue = dueDate.isBefore(moment());
      emission.owner = taskDoc.owner;
      emission.forId = taskDoc.forId ? taskDoc.forId : taskDoc.owner;
      return emission;
    });
  }

  private async refreshTasks() {
    try {
      const telemetryData: any = {
        start: Date.now(),
      };

      const isEnabled = await this.rulesEngineService.isEnabled();
      this.tasksDisabled = !isEnabled;
      const taskDocs = isEnabled ? await this.rulesEngineService.fetchTaskDocsForAllContacts() : [];

      this.hasTasks = taskDocs.length > 0;
      this.loading = false;

      const hydratedTasks = await this.hydrateEmissions(taskDocs) || [];
      const subjects = await this.getLineagesFromTaskDocs(hydratedTasks);
      if (subjects?.size) {
        const userLineageLevel = await this.currentLevel;
        for (const task of hydratedTasks) {
          task.lineage = await this.getTaskLineage(subjects, task, userLineageLevel);
        }
      }

      this.tasksActions.setTasksList(hydratedTasks);

      if (!this.tasksLoaded) {
        this.tasksActions.setTasksLoaded(true);
      }

      telemetryData.end = Date.now();
      const telemetryEntryName = !this.tasksLoaded ? `tasks:load` : `tasks:refresh`;
      this.telemetryService.record(telemetryEntryName, telemetryData.end - telemetryData.start);

    } catch (exception) {
      console.error('Error getting tasks for all contacts', exception);
      this.error = true;
      this.loading = false;
      this.hasTasks = false;
      this.tasksActions.setTasksList([]);
    }
  }

  listTrackBy(index, task) {
    return task?._id;
  }

  private getCurrentLineageLevel() {
    return this.userContactService.get().then(user => user?.parent?.name);
  }

  private getLineagesFromTaskDocs(taskDocs) {
    const ids = [...new Set(taskDocs.map(task => task.forId))];
    return this.lineageModelGeneratorService
      .reportSubjects(ids)
      .then(subjects => new Map(subjects.map(subject => [subject._id, subject.lineage])));
  }

  private getTaskLineage(subjects, task, userLineageLevel) {
    if (!subjects?.size) {
      return;
    }
    const lineage = subjects
      .get(task.forId)
      ?.map(lineage => lineage?.name);
    return this.cleanAndRemoveCurrentLineage(lineage, userLineageLevel);
  }

  private async cleanAndRemoveCurrentLineage(lineage, userLineageLevel) {
    if(!lineage?.length){
      return;
    }
    lineage = lineage.filter(level => level);
    const item = lineage[lineage.length - 1];
    if (item === userLineageLevel) {
      lineage.pop();
    }
    return lineage;
  }
}
