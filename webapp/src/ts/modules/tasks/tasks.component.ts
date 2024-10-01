import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { debounce as _debounce } from 'lodash-es';
import * as moment from 'moment';

import { ChangesService } from '@mm-services/changes.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TasksActions } from '@mm-actions/tasks';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { PerformanceService } from '@mm-services/performance.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';

@Component({
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit, OnDestroy {
  constructor(
    private store: Store,
    private changesService: ChangesService,
    private contactTypesService: ContactTypesService,
    private rulesEngineService: RulesEngineService,
    private performanceService: PerformanceService,
    private lineageModelGeneratorService: LineageModelGeneratorService,
    private extractLineageService: ExtractLineageService,
  ) {
    this.tasksActions = new TasksActions(store);
    this.globalActions = new GlobalActions(store);
  }

  subscription = new Subscription();
  private tasksActions;
  private globalActions;
  private trackLoadPerformance;
  private trackRefreshPerformance;

  tasksList;
  selectedTask;
  errorStack;
  hasTasks;
  loading;
  tasksDisabled;
  userLineageLevel;

  private tasksLoaded;
  private debouncedReload;

  private subscribeToStore() {
    const assignment$ = this.store
      .select(Selectors.getTasksLoaded)
      .subscribe(tasksLoaded => this.tasksLoaded = tasksLoaded);
    this.subscription.add(assignment$);

    const taskList$ = combineLatest([
      this.store.select(Selectors.getTasksList),
      this.store.select(Selectors.getSelectedTask),
    ]).subscribe(([
      tasksList = [],
      selectedTask,
    ]) => {
      this.selectedTask = selectedTask;
      // Make new reference because the one from store is read-only. Fixes: ExpressionChangedAfterItHasBeenCheckedError
      this.tasksList = tasksList.map(task => ({ ...task, selected: task._id === this.selectedTask?._id }));
    });
    this.subscription.add(taskList$);
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
    this.trackLoadPerformance = this.performanceService.track();
    this.tasksActions.setSelectedTask(null);
    this.subscribeToStore();
    this.subscribeToChanges();
    this.subscribeToRulesEngine();
    this.hasTasks = false;
    this.loading = true;
    this.debouncedReload = _debounce(this.refreshTasks.bind(this), 1000, { maxWait: 10 * 1000 });
    this.userLineageLevel = this.extractLineageService.getUserLineageToRemove();
    this.refreshTasks();
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
      const emission = { ...taskDoc.emission };
      const dueDate = moment(emission.dueDate, 'YYYY-MM-DD');
      emission.date = new Date(dueDate.valueOf());
      emission.overdue = dueDate.isBefore(moment());
      emission.owner = taskDoc.owner;

      return emission;
    });
  }

  private async refreshTasks() {
    try {
      if (this.tasksLoaded) {
        this.trackRefreshPerformance = this.performanceService.track();
      }
      const isEnabled = await this.rulesEngineService.isEnabled();
      this.tasksDisabled = !isEnabled;
      const taskDocs = isEnabled ? await this.rulesEngineService.fetchTaskDocsForAllContacts() : [];
      this.hasTasks = taskDocs.length > 0;

      const hydratedTasks = await this.hydrateEmissions(taskDocs) || [];
      const subjects = await this.getLineagesFromTaskDocs(hydratedTasks);
      if (subjects?.size) {
        const userLineageLevel = await this.userLineageLevel;
        hydratedTasks.forEach(task => {
          task.lineage = this.getTaskLineage(subjects, task, userLineageLevel);
        });
      }

      this.tasksActions.setTasksList(hydratedTasks);

    } catch (exception) {
      console.error('Error getting tasks for all contacts', exception);
      this.errorStack = exception.stack;
      this.hasTasks = false;
      this.tasksActions.setTasksList([]);
    } finally {
      this.loading = false;
      this.recordPerformance();
      if (!this.tasksLoaded) {
        this.tasksActions.setTasksLoaded(true);
      }
    }
  }

  private recordPerformance() {
    if (this.tasksLoaded) {
      this.trackRefreshPerformance?.stop({
        name: ['tasks', 'refresh'].join(':'),
        recordApdex: true,
      });
      return;
    }

    this.trackLoadPerformance?.stop({
      name: ['tasks', 'load'].join(':'),
      recordApdex: true,
    });
  }

  listTrackBy(index, task) {
    return task?._id;
  }

  private getLineagesFromTaskDocs(taskDocs) {
    const ids = [ ...new Set(taskDocs.map(task => task.owner)) ];
    return this.lineageModelGeneratorService
      .reportSubjects(ids)
      .then(subjects => new Map(subjects.map(subject => [subject._id, subject.lineage])));
  }

  private getTaskLineage(subjects, task, userLineageLevel) {
    const lineage = subjects
      .get(task.owner)
      ?.map(lineage => lineage?.name);
    return this.extractLineageService.removeUserFacility(lineage, userLineageLevel);
  }
}
