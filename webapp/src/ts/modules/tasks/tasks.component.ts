import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { debounce as _debounce } from 'lodash-es';

import { ChangesService } from '@mm-services/changes.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TasksActions } from '@mm-actions/tasks';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { SessionService } from '@mm-services/session.service';
import { PerformanceService } from '@mm-services/performance.service';

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
    private userContactService: UserContactService,
    private sessionService: SessionService,
  ) {
    this.tasksActions = new TasksActions(store);
    this.globalActions = new GlobalActions(store);
  }

  subscription = new Subscription();
  private tasksActions;
  private globalActions;
  private trackPerformance;

  tasksList;
  selectedTask;
  errorStack;
  hasTasks;
  loading;
  tasksDisabled;
  currentLevel;

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
    this.trackPerformance = this.performanceService.track();
    this.tasksActions.setSelectedTask(null);
    this.subscribeToStore();
    this.subscribeToChanges();
    this.subscribeToRulesEngine();
    this.hasTasks = false;
    this.loading = true;
    this.debouncedReload = _debounce(this.refreshTasks.bind(this), 1000, { maxWait: 10 * 1000 });

    this.currentLevel = this.sessionService.isOnlineOnly() ? Promise.resolve() : this.getCurrentLineageLevel();
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

  private async refreshTasks() {
    try {
      this.tasksDisabled = !(await this.rulesEngineService.isEnabled());
      const taskDocs = this.tasksDisabled ? [] : await this.rulesEngineService.fetchTaskDocsForAllContacts() || [];
      this.hasTasks = taskDocs.length > 0;
      const taskEmissions = await this.getTasksWithLineage(taskDocs, await this.currentLevel);
      this.tasksActions.setTasksList(taskEmissions);

    } catch (exception) {
      console.error('Error getting tasks for all contacts', exception);
      this.errorStack = exception.stack;
      this.hasTasks = false;
      this.tasksActions.setTasksList([]);
    } finally {
      this.loading = false;
      const performanceName = this.tasksLoaded ? 'tasks:refresh' : 'tasks:load';
      this.trackPerformance?.stop({
        name: performanceName,
        recordApdex: true,
      });
      if (!this.tasksLoaded) {
        this.tasksActions.setTasksLoaded(true);
      }
    }
  }

  listTrackBy(index, task) {
    return task?._id;
  }

  private getCurrentLineageLevel() {
    return this.userContactService.get().then(user => user?.parent?.name);
  }

  private async getTasksWithLineage(taskDocs, userLineageLevel) {
    const ids = [ ...new Set(taskDocs.map(task => task.owner)) ];
    const subjects = await this.lineageModelGeneratorService.reportSubjects(ids);
    const subjectMap = new Map(subjects.map(subject => [subject._id, subject.lineage]));
    if (subjects?.size <= 0) {
      return;
    }

    return taskDocs.map(task => {
      const { emission } = task;
      emission.lineage = this.cleanAndRemoveCurrentLineage(subjectMap.get(task.owner), userLineageLevel);
      return emission;
    });
  }

  private cleanAndRemoveCurrentLineage(taskLineage, userLineageLevel) {
    if (!taskLineage?.length) {
      return;
    }

    const lastLineage = taskLineage.length - 1;
    return taskLineage
      .filter((lineage, index) => {
        const isUserPlace = index === lastLineage && lineage?.name === userLineageLevel;
        return lineage?.name && !isUserPlace;
      })
      .map(lineage => lineage.name);
  }
}
