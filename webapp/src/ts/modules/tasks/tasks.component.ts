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
  private trackPerformance;

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
    this.trackPerformance = this.performanceService.track();
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

  private async refreshTasks() {
    try {
      this.tasksDisabled = !(await this.rulesEngineService.isEnabled());
      const taskDocs = this.tasksDisabled ? [] : await this.rulesEngineService.fetchTaskDocsForAllContacts() || [];
      this.hasTasks = taskDocs.length > 0;
      const userLineageLevel = await this.userLineageLevel;
      const taskEmissions = await this.getTasksWithLineage(taskDocs, userLineageLevel);
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

  private async getTasksWithLineage(taskDocs, userLineageLevel) {
    const ownerIds = [ ...new Set(taskDocs.map(task => task.owner)) ];
    const subjects = await this.lineageModelGeneratorService.reportSubjects(ownerIds);
    const subjectLineageMap = new Map();
    subjects.forEach(subject => {
      const taskLineage = subject.lineage
        ?.filter(level => level?.name)
        .map(level => level.name);

      if (taskLineage?.length) {
        subjectLineageMap.set(subject._id, taskLineage);
      }
    });

    return taskDocs.map(task => {
      return {
        ...task.emission,
        lineage: this.extractLineageService.removeUserFacility(subjectLineageMap.get(task.owner), userLineageLevel),
      };
    });
  }
}
