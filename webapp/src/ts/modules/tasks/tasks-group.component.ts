import { Component, OnDestroy, OnInit } from '@angular/core';
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

  tasks;
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
  ) {
    this.globalActions = new GlobalActions(store);
    this.tasksActions = new TasksActions(store);
  }

  ngOnInit() {
    this.setNavigation();
    this.subscribeToStore();
    this.leafPlaceTypes$ = this.contactTypesService.getLeafPlaceTypes();
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
      this.globalActions.setSnackbarContent(this.translateService.instant('tasks.group.complete'));
    }
    this.globalActions.navigationCancel();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.globalActions.clearNavigation();
    this.globalActions.setLoadingContent(false);
    this.globalActions.setShowContent(false);
    this.tasksActions.setLastCompletedTask(null);
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

    const lastTaskSubscription = this.store
      .select(Selectors.getLastCompletedTask)
      .subscribe((lastCompletedTask) => {
        this.displayHouseholdTasks(lastCompletedTask);
      });

    this.subscription.add(lastTaskSubscription);
    this.subscription.add(storeSubscription);
  }

  private getTaskContact(task) {
    return task?.actions?.[0]?.content?.contact?._id;
  }

  private async displayHouseholdTasks(task) {
    this.globalActions.setShowContent(true);
    this.globalActions.setLoadingContent(true);
    this.globalActions.setTitle(this.translateService.instant('tasks.group.title'));
    this.tasks = [];

    const contactId = this.getTaskContact(task);
    if (!contactId) {
      this.navigationCancel();
      return;
    }

    try {
      const contactModel = await this.displayTasksFor(contactId);
      if (!contactModel) {
        this.navigationCancel();
        return;
      }

      const tasks = await this.tasksForContactService.get(contactModel);
      // intentionally don't block on telemetry, but start counting after tasks were recalculated
      this.recordTaskCountTelemetry(contactModel);
      if (!tasks || !tasks.length) {
        this.navigationCancel(true);
        return;
      }

      this.setNavigation(true);
      this.tasks = tasks;
      this.globalActions.setLoadingContent(false);
    } catch (err) {
      console.error('Error loading tasks to display', err);
      this.contentError = true;
      this.globalActions.setLoadingContent(false);
      this.setNavigation(false);
    }
  }

  private async recordTaskCountTelemetry(contactModel) {
    const taskCounts = await this.tasksForContactService.getTasksBreakdown(contactModel);
    let allTasksCount = 0;
    Object.keys(taskCounts).forEach(state => allTasksCount += taskCounts[state]);

    this.telemetryService.record('tasks:group:all-tasks', allTasksCount);
    this.telemetryService.record('tasks:group:cancelled', taskCounts.Cancelled);
    this.telemetryService.record('tasks:group:ready', taskCounts.Ready);
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
  }

  private async displayTasksFor(contactId) {
    const { doc, lineage } = await this.lineageModelGeneratorService.contact(contactId);

    if (!doc || !lineage) {
      return false;
    }

    const leafPlaceTypes = await this.leafPlaceTypes$;
    for (const contact of [doc, ...lineage]) {
      const typeId = this.contactTypesService.getTypeId(contact);
      if (this.contactTypesService.isLeafPlaceType(leafPlaceTypes, typeId)) {
        const model = await this.contactViewModelGeneratorService.getContact(contact._id);
        model.children = await this.contactViewModelGeneratorService.loadChildren(model);
        return model;
      }
    }
    return false;
  }

  isHouseHoldTask(emissionId) {
    return Array.isArray(this.tasks) && this.tasks.find((task:any) => task?.emission?._id === emissionId);
  }

  canDeactivate(nextUrl) {
    if (!this.tasks || !this.tasks.length || !this.cancelCallback || !this.preventNavigation) {
      return true;
    }

    const emissionId = this.getEmissionIdFromUrl(nextUrl);
    if (emissionId && this.isHouseHoldTask(emissionId)) {
      return true;
    }

    this.globalActions.navigationCancel(nextUrl);
    return false;
  }

  private getEmissionIdFromUrl(url) {
    const tree = this.router.parseUrl(url);
    const segments = tree.root.children[PRIMARY_OUTLET].segments;
    if (segments.length < 2 || segments[0].path !== 'tasks') {
      return;
    }

    const emissionId = segments[1].path;
    return emissionId;
  }
}
