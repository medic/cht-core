import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ErrorLogComponent } from '@mm-components/error-log/error-log.component';
import { TranslatePipe } from '@ngx-translate/core';
import { LineagePipe } from '@mm-pipes/message.pipe';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { TaskDueDatePipe } from '@mm-pipes/date.pipe';
import { SearchBarComponent } from '@mm-components/search-bar/search-bar.component';
import { TasksSidebarFilterComponent } from './tasks-sidebar-filter.component';

@Component({
  templateUrl: './tasks.component.html',
  imports: [
    ToolBarComponent,
    NgIf,
    NgFor,
    NgClass,
    RouterLink,
    ErrorLogComponent,
    RouterOutlet,
    TranslatePipe,
    LineagePipe,
    ResourceIconPipe,
    TaskDueDatePipe,
    SearchBarComponent,
    TasksSidebarFilterComponent,
  ],
})
export class TasksComponent implements OnInit, OnDestroy {
  @ViewChild(TasksSidebarFilterComponent) tasksSidebarFilter?: TasksSidebarFilterComponent;

  constructor(
    private readonly store: Store,
    private readonly changesService: ChangesService,
    private readonly contactTypesService: ContactTypesService,
    private readonly rulesEngineService: RulesEngineService,
    private readonly performanceService: PerformanceService,
    private readonly lineageModelGeneratorService: LineageModelGeneratorService,
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
  isSidebarFilterOpen = false;

  private tasksLoaded;
  private debouncedReload;

  private subscribeToStore() {
    const assignment$ = this.store
      .select(Selectors.getTasksLoaded)
      .subscribe(tasksLoaded => this.tasksLoaded = tasksLoaded);
    this.subscription.add(assignment$);

    const taskList$ = combineLatest([
      this.store.select(Selectors.getFilteredTasksList),
      this.store.select(Selectors.getSelectedTask),
    ]).subscribe(([
      tasksList = [],
      selectedTask,
    ]) => {
      this.selectedTask = selectedTask;
      // Make new reference because the one from store is read-only
      this.tasksList = tasksList.map(task => ({ ...task, selected: task._id === this.selectedTask?._id }));
      this.hasTasks = this.tasksList.length > 0;
    });
    this.subscription.add(taskList$);

    const sidebarFilter$ = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(sidebarFilter => {
        this.isSidebarFilterOpen = !!sidebarFilter?.isOpen;
      });
    this.subscription.add(sidebarFilter$);
  }

  toggleFilter() {
    this.tasksSidebarFilter?.toggleSidebarFilter();
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
    this.refreshTasks();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.tasksActions.clearTaskList();
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
      if (this.tasksLoaded) {
        this.trackRefreshPerformance = this.performanceService.track();
      }
      const isEnabled = await this.rulesEngineService.isEnabled();
      this.tasksDisabled = !isEnabled;
      const taskDocs = isEnabled ? await this.rulesEngineService.fetchTaskDocsForAllContacts() : [];
      this.hasTasks = taskDocs.length > 0;

      const emissions = taskDocs.map(taskDoc => taskDoc.emission);
      const subjects = await this.getLineagesFromTaskDocs(emissions);
      const tasksWithLineage = emissions.map(task => ({
        ...task,
        ...this.getTaskLineage(subjects, task)
      }));
      this.tasksActions.setTasksList(tasksWithLineage);

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

  private getTaskLineage(subjects, task) {
    const lineageData = (subjects.get(task.owner) || []).filter(Boolean);
    const lineageNames = lineageData.map(item => item?.name).filter(Boolean);
    const lineageIds = lineageData.map(item => item?._id).filter(Boolean);

    return {
      lineage: lineageNames,
      lineageIds: [task.owner, ...lineageIds],
    };
  }
}
