import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild } from '@angular/core';
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
import { UserContactService } from '@mm-services/user-contact.service';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ErrorLogComponent } from '@mm-components/error-log/error-log.component';
import { TranslatePipe } from '@ngx-translate/core';
import { LineagePipe } from '@mm-pipes/message.pipe';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { TaskDueDatePipe } from '@mm-pipes/date.pipe';
import { SearchBarComponent } from '@mm-components/search-bar/search-bar.component';
import { SidebarFilterComponent } from '@mm-modules/util/sidebar-filter.component';
import _ from 'lodash';
import { DeduplicateService } from '@mm-services/deduplicate.service';

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
    SidebarFilterComponent
  ],
})
export class TasksComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(SidebarFilterComponent) reportsSidebarFilter?: SidebarFilterComponent;
  constructor(
    private readonly store: Store,
    private readonly changesService: ChangesService,
    private readonly contactTypesService: ContactTypesService,
    private readonly rulesEngineService: RulesEngineService,
    private readonly performanceService: PerformanceService,
    private readonly lineageModelGeneratorService: LineageModelGeneratorService,
    private readonly extractLineageService: ExtractLineageService,
    private readonly userContactService: UserContactService,
    private readonly router: Router,
    private readonly deduplicate: DeduplicateService
  ) {
    this.tasksActions = new TasksActions(store);
    this.globalActions = new GlobalActions(store);
  }

  subscription = new Subscription();
  private tasksActions;
  private globalActions;
  private trackLoadPerformance;
  private trackRefreshPerformance;

  private subjects;

  tasksList;
  selectedTask;
  errorStack;
  hasTasks;
  loading;
  tasksDisabled;
  userLineageLevel;

  isSidebarFilterOpen = false;
  filters: any = {};
  readonly BASE_CONTACT = {type: '', _rev: '', _id: ''};

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
      this.store.select(Selectors.getFilters),
    ]).subscribe(([
      tasksList = [],
      selectedTask,
      filters,
    ]) => {
      this.selectedTask = selectedTask;
      // Make new reference because the one from store is read-only. Fixes: ExpressionChangedAfterItHasBeenCheckedError
      this.tasksList = tasksList.map(task => ({ ...task, selected: task._id === this.selectedTask?._id }));
      this.filters = filters;

      // If the selected task no longer exists in the filtered list, clear selection
      const selectedStillExists = tasksList.some(task => task._id === selectedTask?._id);
      if (selectedTask && !selectedStillExists) {
        this.tasksActions.setSelectedTask(null);
        this.router.navigate(['./tasks']);
      }
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
    this.hasTasks = false;
    this.loading = true;
    this.trackLoadPerformance = this.performanceService.track();
    this.tasksActions.setSelectedTask(null);
    this.subscribeToStore();
    this.subscribeToChanges();
    this.subscribeToRulesEngine();
    this.debouncedReload = _debounce(async () => {
      await this.refreshTasks();
      this.filter();
    }, 1000, { maxWait: 10 * 1000 });
    this.userLineageLevel = this.userContactService.getUserLineageToRemove();
    this.refreshTasks();
  }

  ngAfterViewInit(): void {
    this.subscribeSidebarFilter();
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
      this.subjects = await this.getLineagesFromTaskDocs(hydratedTasks);
      if (this.subjects?.size) {
        const userLineageLevel = await this.userLineageLevel;
        hydratedTasks.forEach(task => {
          task.lineage = this.getTaskLineage(this.subjects, task, userLineageLevel);
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

  filter = async () => {
    this.trackLoadPerformance = this.performanceService.track();
    
    const fromDate = this.filters?.date?.from;
    const toDate = this.filters?.date?.to;
    const forms = this.filters?.forms?.selected?.map(({id}) => id.toString().split(':')[1]) ?? [];
    const facilities = this.filters?.facilities?.selected ?? [];
    const searchTerm = this.filters?.search ?? '';
    const current = {...this.BASE_CONTACT, name: searchTerm};

    this.tasksList = this.tasksList.filter((e) => {
      console.log(e);

      const dueDate = e?.date;
      console.log(e);
      if (dueDate && (dueDate < fromDate) || (dueDate > toDate)){
        console.log('Due date is not within range');
        return;
      }

      // TODO: test with more actions
      const actions = e?.actions;
      if (forms.length > 0 && actions && actions.length > 0 && !forms.includes(actions[0].form)){
        return;
      }
      
      const existing = [{
        ...this.BASE_CONTACT, 
        _id: e.emission?.forId, 
        name: e.emission?.contact?.name
      }];
      if (searchTerm && this.deduplicate.getDuplicates(current, '', existing).length === 0){
        return;
      }

      if (facilities.length > 0 && !this.isPartOfFilteredFacility(facilities, e)) {
        return false;
      }
      
      return true;
    });

    this.trackLoadPerformance?.stop({
      name: ['tasks', 'filter'].join(':'),
      recordApdex: true,
    });
  };

  private isPartOfFilteredFacility (facilities, task){
    const lineage = this.subjects.get(task?.forId) ?? [];
    let contains = false;
    for (const fId of facilities){
      if (lineage.filter((e) => e._id === fId).length > 0){
        contains = true;
        break;
      }
    }
    return contains;
  }

  toggleFilter() {
    this.reportsSidebarFilter?.toggleSidebarFilter();
  }

  resetFilter() {
    this.reportsSidebarFilter?.resetFilters();
  }

  private subscribeSidebarFilter() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(({ isOpen }) => this.isSidebarFilterOpen = !!isOpen);
    this.subscription.add(subscription);
  }
}
