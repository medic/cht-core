import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { TelemetryService } from '@mm-services/telemetry.service';
import { GlobalActions } from '@mm-actions/global';
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
  private subscription = new Subscription();
  private leafPlaceTypes$;
  tasks:[];
  cancelCallback;
  loadingContent;
  contentError;
  errorTranslationKey;
  private lastCompletedTask;
  private activePlace;

  constructor(
    private route:ActivatedRoute,
    private router:Router,
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private contactTypesService:ContactTypesService,
    private store:Store,
    private translateService:TranslateService,
    private tasksForContactService:TasksForContactService,
    private contactViewModelGeneratorService:ContactViewModelGeneratorService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.subscribeToRoute();
    this.subscribeToStore();
    this.leafPlaceTypes$ = this.contactTypesService.getLeafPlaceTypes();

    const cancelCallback = (router:Router) => {
      return router.navigate(['/tasks']);
    };

    this.globalActions.setNavigation({
      cancelCallback: cancelCallback.bind({}, this.router),
      preventNavigation: true,
      cancelMessage: 'task.group.leave',
    });


  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private subscribeToStore() {
    const subscription = combineLatest(
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getCancelCallback),
      this.store.select(Selectors.getLastCompletedTask),
      this.store.select(Selectors.getActiveTaskPlace),
    ).subscribe(([
      loadingContent,
      cancelCallback,
      lastCompletedTask,
      getActiveTaskPlace,
    ]) => {
      this.loadingContent = loadingContent;
      this.cancelCallback = cancelCallback;
    });
    this.subscription.add(subscription);
  }

  private subscribeToRoute() {
    const routeSubscription = this.route.params.subscribe((params) => this.displayHouseholdTasks(params.id));
    this.subscription.add(routeSubscription);
  }

  private async displayHouseholdTasks(contactId) {
    this.globalActions.setLoadingContent(true);
    this.tasks = [];
    if (!contactId) {
      return;
    }

    const contact = await this.displayTasksFor(contactId);
    if (!contact) {
      this.globalActions.navigationCancel();
      return;
    }

    const tasks = await this.tasksForContactService.get(contact);
    if (!tasks || !tasks.length) {
      this.globalActions.setSnackbarContent(this.translateService.instant('tasks.group.complete'));
      this.globalActions.navigationCancel();
      return;
    }

    this.tasks = tasks;
    this.globalActions.setLoadingContent(false);
  }

  private async displayTasksFor(contactId) {
    const { doc, lineage } = await this.lineageModelGeneratorService.contact(contactId);

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
}
