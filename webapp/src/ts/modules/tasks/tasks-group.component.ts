import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { PRIMARY_OUTLET, Router } from '@angular/router';

import { TelemetryService } from '@mm-services/telemetry.service';
import { GlobalActions } from '@mm-actions/global';
import { TasksActions } from '@mm-actions/tasks';
import { Selectors } from '@mm-selectors/index';
import { TranslateService } from '@mm-services/translate.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';


@Component({
  templateUrl: './tasks-group.component.html'
})
export class TasksGroupComponent implements OnInit, OnDestroy {
  private globalActions;
  private tasksActions;
  private leafPlaceTypes$;
  private cancelCallback;
  private preventNavigation;

  subscription = new Subscription();

  private tasksList;
  private contactModel;
  private lastCompletedTask;
  private taskGroupContact;
  private telemetryRecorded;

  tasks = [];
  loadingContent;
  contentError;
  errorTranslationKey = 'tasks.group.error';

  constructor(
    private router:Router,
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private contactTypesService:ContactTypesService,
    private store:Store,
    private translateService:TranslateService,
    private tasksForContactService:TasksForContactService,
    private contactViewModelGeneratorService:ContactViewModelGeneratorService,
    private telemetryService:TelemetryService,
    private ngZone:NgZone,
  ) {
    this.globalActions = new GlobalActions(store);
    this.tasksActions = new TasksActions(store);
  }

  ngOnInit() {
    this.setNavigation();
    this.subscribeToStore();
    this.leafPlaceTypes$ = this.contactTypesService.getLeafPlaceTypes();

    this.globalActions.setShowContent(true);
    this.globalActions.setLoadingContent(true);
    this.globalActions.setTitle(this.translateService.instant('tasks.group.title'));
  }

  private setNavigation(preventNavigation?:Boolean) {
    const cancelCallback = (router:Router, globalActions) => {
      globalActions.setPreventNavigation(false);
      router.navigate(['/tasks']);
    };

    this.globalActions.setNavigation({
      cancelCallback: cancelCallback.bind({}, this.router, this.globalActions),
      preventNavigation,
      cancelTranslationKey: 'tasks.group.leave',
      recordTelemetry: 'tasks:group:modal:',
    });
  }

  private navigationCancel(completed?:Boolean) {
    if (completed) {
      this.globalActions.setSnackbarContent(this.translateService.instant('tasks.group.completed'));
    }
    this.globalActions.navigationCancel();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.globalActions.clearNavigation();
    this.tasksActions.clearTaskGroup();
    this.globalActions.setLoadingContent(false);
    this.globalActions.setShowContent(false);
  }

  private subscribeToStore() {
    const storeSubscription = combineLatest(
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getCancelCallback),
      this.store.select(Selectors.getPreventNavigation),
    ).subscribe(([
      loadingContent,
      cancelCallback,
      preventNavigation,
    ]) => {
      this.loadingContent = loadingContent;
      this.cancelCallback = cancelCallback;
      this.preventNavigation = preventNavigation;
    });

    const lastTaskSubscription = combineLatest(
      this.store.select(Selectors.getLastCompletedTask),
      this.store.select(Selectors.getTaskGroupContact),
      this.store.select(Selectors.getTaskGroupLoadingContact),
      this.store.select(Selectors.getTasksList),
    ).subscribe(([
      lastCompletedTask,
      contact,
      loadingContact,
      tasksList,
    ]) => {
      console.warn('task list refreshed');
      this.tasksList = tasksList;
      this.lastCompletedTask = lastCompletedTask;
      this.taskGroupContact = contact;

      if (!loadingContact) {
        this.loadGroupTasks();
      }
    });

    this.subscription.add(lastTaskSubscription);
    this.subscription.add(storeSubscription);
  }

  private getTaskOwner(task) {
    return task?.owner;
  }

  private cherryPickTasks(contactIds:Array<string>) {
    return this.tasksList.filter(task =>
      task._id !== this.lastCompletedTask._id && // don't display the task we already completed
      contactIds.includes(this.getTaskOwner(task))
    );
  }

  /*
  Only loads the contact's children once, no matter how may times the function is called
  */
  private async loadContactModel() {
    if (this.contactModel && this.contactModel.children) {
      return await this.contactModel.getChildren$;
    }

    if (!this.taskGroupContact) {
      return;
    }

    const getChildren$ = this.contactViewModelGeneratorService.loadChildren(this.taskGroupContact, { hydrate: false });
    this.contactModel = {
      ...this.taskGroupContact,
      getChildren$,
    };
    this.contactModel.children = await getChildren$;
  }

  private async loadGroupTasks() {
    try {
      await this.loadContactModel();
      if (!this.contactModel) {
        this.navigationCancel();
        return;
      }

      const idsForTasks = this.tasksForContactService.getIdsForTasks(this.contactModel);
      const filteredTasks = this.cherryPickTasks(idsForTasks);
      console.log(JSON.stringify(filteredTasks, null, 2));
      if (!filteredTasks || !filteredTasks.length) {
        this.navigationCancel(true);
        return;
      }

      this.setNavigation(true);
      this.tasks = filteredTasks;
      this.globalActions.setLoadingContent(false);
      this.recordTaskCountTelemetry(this.contactModel);
    } catch (err) {
      console.error('Error loading tasks group', err);
      this.contentError = true;
      this.globalActions.setLoadingContent(false);
      this.setNavigation(false);
    }
  }

  private recordTaskCountTelemetry(contactModel) {
    if (this.telemetryRecorded) {
      return;
    }

    this.ngZone.runOutsideAngular(async () => {
      this.telemetryRecorded = true;
      const taskCounts = await this.tasksForContactService.getTasksBreakdown(contactModel);
      let allTasksCount = 0;
      Object.keys(taskCounts).forEach(state => allTasksCount += taskCounts[state]);

      this.telemetryService.record('tasks:group:all-tasks', allTasksCount);
      this.telemetryService.record('tasks:group:cancelled', taskCounts.Cancelled);
      this.telemetryService.record('tasks:group:ready', this.tasks.length);
      const breakdownByTitle:any = { };
      this.tasks.forEach(({ title }) => {
        if (Object.hasOwnProperty.call(breakdownByTitle, title)) {
          breakdownByTitle[title]++;
        } else {
          breakdownByTitle[title] = 1;
        }
      });
      Object.keys(breakdownByTitle).forEach(title => {
        this.telemetryService.record(`tasks:group:ready:${title}`, breakdownByTitle[title]);
      });
    });
  }

  isGroupTask(emissionId) {
    return Array.isArray(this.tasks) && this.tasks.find((task:any) => task?._id === emissionId);
  }

  canDeactivate(nextUrl) {
    console.log('can deactivate called');
    console.log(JSON.stringify(this.tasks, null, 2));
    console.log(JSON.stringify(this.preventNavigation, null, 2));
    console.log(JSON.stringify(this.lastCompletedTask, null, 2));
    if (!this.tasks || !this.tasks.length || !this.cancelCallback || !this.preventNavigation) {
      return true;
    }

    const emissionId = this.getEmissionIdFromUrl(nextUrl);
    if (emissionId && this.isGroupTask(emissionId)) {
      return true;
    }

    this.globalActions.navigationCancel(nextUrl);
    return false;
  }

  private getEmissionIdFromUrl(url) {
    const tree = this.router.parseUrl(url);
    // https://angular.io/api/router/UrlTree#example
    const segments = tree.root.children[PRIMARY_OUTLET].segments;
    if (segments && segments.length === 2 && segments[0]?.path === 'tasks') {
      return segments[1]?.path;
    }
  }
}
