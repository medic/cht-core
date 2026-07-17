import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subject, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { FormService, WebappEnketoFormContext } from '@mm-services/form.service';
import { PerformanceService } from '@mm-services/performance.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { GlobalActions } from '@mm-actions/global';
import { TasksActions } from '@mm-actions/tasks';
import { Selectors } from '@mm-selectors/index';
import { GeolocationService } from '@mm-services/geolocation.service';
import { TranslateService } from '@mm-services/translate.service';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { InteractionTrackingService } from '@mm-services/interaction-tracking.service';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { TranslatePipe } from '@ngx-translate/core';
import { SimpleDatePipe } from '@mm-pipes/date.pipe';
import { TranslateFromPipe } from '@mm-pipes/translate-from.pipe';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { Contact, Qualifier } from '@medic/cht-datasource';
import { FormConfig } from '@mm-services/form/form-config';
import { EnketoForm } from '@mm-services/enketo.service';

@Component({
  templateUrl: './tasks-content.component.html',
  imports: [NgIf, NgClass, NgFor, EnketoComponent, TranslatePipe, SimpleDatePipe, TranslateFromPipe]
})
export class TasksContentComponent implements OnInit, OnDestroy {
  constructor(
    private readonly translateService:TranslateService,
    private readonly route:ActivatedRoute,
    private readonly store:Store,
    private readonly formService:FormService,
    private readonly performanceService:PerformanceService,
    private readonly translateFromService:TranslateFromService,
    private readonly xmlFormsService:XmlFormsService,
    private readonly geolocationService:GeolocationService,
    private readonly router:Router,
    private readonly tasksForContactService:TasksForContactService,
    private readonly interactionTrackingService:InteractionTrackingService,
    chtDatasourceService: CHTDatasourceService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.tasksActions = new TasksActions(store);
    this.getContact = chtDatasourceService.bind(Contact.v1.get);
  }

  subscription = new Subscription();
  private readonly globalActions;
  private readonly tasksActions;
  private readonly getContact: ReturnType<typeof Contact.v1.get>;

  enketoStatus;
  private enketoEdited;
  loadingContent;
  selectedTask: any = null;
  form?: EnketoForm;
  loadingForm;
  contentError;
  private cancelCallback;
  errorTranslationKey;
  private tasksList;
  private geoHandle;
  private enketoError;
  private enketoSaving;
  private trackRender;
  private trackEditDuration;
  private trackSave;
  private readonly trackMetadata = { action: '' };
  private readonly viewInited = new Subject();

  ngOnInit() {
    this.trackRender = this.performanceService.track();
    this.subscribeToStore();
    this.subscribeToRouteParams();

    this.form = undefined;
    this.resetFormError();

    this.tasksActions.setLastSubmittedTask(null);
    this.viewInited.next(true);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.geoHandle?.cancel();
    this.formService.unload(this.form);
    this.globalActions.clearNavigation();
    this.globalActions.clearEnketoStatus();
  }

  private subscribeToStore() {
    const subscription = combineLatest(
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoError),
      this.store.select(Selectors.getEnketoEditedStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSelectedTask),
      this.store.select(Selectors.getCancelCallback),
      this.store.select(Selectors.getTasksList),
    ).subscribe(([
      enketoStatus,
      enketoError,
      enketoEdited,
      enketoSaving,
      loadingContent,
      selectedTask,
      cancelCallback,
      taskList,
    ]) => {
      this.enketoStatus = enketoStatus;
      this.enketoError = enketoError;
      this.enketoEdited = enketoEdited;
      this.enketoSaving = enketoSaving;
      this.loadingContent = loadingContent;
      this.selectedTask = selectedTask;
      this.cancelCallback = cancelCallback;
      this.tasksList = taskList;
    });
    this.subscription.add(subscription);
  }

  private subscribeToRouteParams() {
    // we only want to load the current task once:
    // - the tasks list is loaded
    // - the view is inited
    // - every time route params change

    const setSelectedSubscription = combineLatest(
      this.route.params,
      this.store.select(Selectors.getTasksLoaded),
      this.viewInited,
    ).subscribe(([params, loaded, inited]) => {
      if (loaded && params && inited) {
        this.setSelected(params.id);
      }
    });
    this.subscription.add(setSelectedSubscription);
  }

  private setSelected(id) {
    if (!id) {
      this.tasksActions.setSelectedTask(null);
      this.globalActions.unsetSelected();
      return;
    }

    const task = this.tasksList.find(task => task?._id === id);
    if (!task) {
      this.tasksActions.setSelectedTask(null);
      this.globalActions.unsetSelected();
      return;
    }

    const taskIndex = this.tasksList.indexOf(task);
    this.interactionTrackingService.record('task:open', task.titleKey, String(taskIndex));

    this.geoHandle = this.geolocationService.init();
    this.globalActions.settingSelected();

    return this
      .hydrateTaskEmission(task)
      .then(hydratedTask => {
        this.tasksActions.setSelectedTask(hydratedTask);
        this.globalActions.setTitle(hydratedTask?.title);
        this.globalActions.setShowContent(true);

        if (this.hasOneActionAndNoFields(hydratedTask)) {
          return this.performAction(hydratedTask.actions[0], true);
        }
      });
  }

  private async hydrateTaskEmission(task) {
    if (!Array.isArray(task.actions) || task.actions.length === 0 || !task.forId) {
      return Promise.resolve(task);
    }

    const setActionsContacts = (task, contact) => {
      return {
        ...task,
        actions: task.actions.map(action => {
          return {
            ...action,
            content: {
              ...action?.content,
              contact: action?.content?.contact || contact,
              task_id: task._id
            },
          };
        }),
      };
    };

    const contact = await this.getContact(Qualifier.byUuid(task.forId));

    if (!contact) {
      console.info('Contact not found for task action:', task.forId);
      return setActionsContacts(task, { _id: task.forId });
    }

    return setActionsContacts(task, contact);
  }

  private hasOneActionAndNoFields(task) {
    return Boolean(
      task?.actions?.length === 1 &&
      (!task?.fields?.length || !task.fields?.[0].value?.length)
    );
  }

  private markFormEdited() {
    this.globalActions.setEnketoEditedStatus(true);
  }

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  private renderForm(action, formConfig: FormConfig) {
    this.globalActions.setEnketoEditedStatus(false);

    const formContext = new WebappEnketoFormContext('#task-report', formConfig, action.content);
    formContext.editedListener = this.markFormEdited.bind(this);
    formContext.valuechangeListener = this.resetFormError.bind(this);

    return this.formService
      .render(formContext)
      .then((formInstance) => {
        this.form = formInstance;
        this.loadingForm = false;
        if (formConfig.doc.translation_key) {
          this.globalActions.setTitle(this.translateService.instant(formConfig.doc.translation_key));
        } else {
          this.globalActions.setTitle(this.translateFromService.get(formConfig.doc.title));
        }
      });
  }

  private preloadTaskGroupContact(action) {
    this.tasksActions.setTaskGroupContactLoading(true);
    return this.tasksForContactService
      .getLeafPlaceAncestor(action?.content?.contact?._id)
      .then(contactModel => {
        this.tasksActions.setTaskGroupContact(contactModel);
      })
      .catch(err => {
        console.error('Error when loading task group contact', err);
        this.tasksActions.setTaskGroupContact(null);
      });
  }

  performAction(action, skipDetails?) {
    if (!action) {
      return;
    }

    if (skipDetails) {
      const cancelCallback = (tasksActions:TasksActions, router:Router) => {
        tasksActions.setSelectedTask(null);
        router.navigate(['/tasks']);
      };
      this.globalActions.setCancelCallback(cancelCallback.bind({}, this.tasksActions, this.router));
    } else {
      const cancelCallback = () => {
        this.interactionTrackingService.record('task:back');
        this.tasksActions.setSelectedTask(null);
        this.formService.unload(this.form);
        this.form = undefined;
        this.loadingForm = false;
        this.contentError = false;
        this.globalActions.clearNavigation();
      };
      // unfortunately, this callback has to update the component itself
      this.globalActions.setCancelCallback(cancelCallback.bind(this));
    }

    this.contentError = false;
    this.resetFormError();
    if (action.type === 'report') {
      this.interactionTrackingService.record('task:form_open', action.form);
      this.loadingForm = true;
      return this.xmlFormsService
        .getFormConfig('task', action.form)
        .then((formConfig) => this.renderForm(action, formConfig))
        .then(() => {
          this.trackMetadata.action = action.content.doc ? 'edit' : 'add';
          this.trackRender?.stop({
            name: [ 'enketo', 'tasks', action.form, this.trackMetadata.action, 'render' ].join(':'),
            recordApdex: true,
          });
          this.trackEditDuration = this.performanceService.track();
        })
        .catch((err) => {
          this.errorTranslationKey = err?.translationKey || 'error.loading.form';
          this.contentError = true;
          this.loadingForm = false;
          console.error('Error loading form.', err);
        })
        .then(() => this.preloadTaskGroupContact(action));
    }

    if (action.type === 'contact') {
      if (action.content?.parent_id && action.content?.type) {
        this.router.navigate(['/contacts', action.content.parent_id, 'add', action.content.type || '']);
      } else if (action.content?.type) {
        this.router.navigate(['/contacts', 'add', action.content.type]);
      } else if (action.content?.edit_id) {
        this.router.navigate(['/contacts', action.content.edit_id, 'edit']);
      } else {
        this.router.navigate(['/contacts', action.content?.contact?._id ?? '']);
      }
    }
  }

  save() {
    if (this.enketoSaving) {
      console.debug('Attempted to call tasks-content.component:save more than once');
      return;
    }

    const formId = this.form?.config.doc.internalId;
    this.interactionTrackingService.record('task:form_save', formId);

    this.trackEditDuration?.stop({
      name: [ 'enketo', 'tasks', formId, this.trackMetadata.action, 'user_edit_time' ].join(':'),
    });
    this.trackSave = this.performanceService.track();

    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();

    return this.formService
      .save(this.form!, this.geoHandle)
      .then((docs) => {
        console.debug('saved report and associated docs', docs);
        this.globalActions.setSnackbarContent(this.translateService.instant('report.created'));

        this.tasksActions.setLastSubmittedTask(this.selectedTask);
        this.globalActions.setEnketoSavingStatus(false);
        this.globalActions.setEnketoEditedStatus(false);
        this.formService.unload(this.form);
        this.globalActions.unsetSelected();
        this.globalActions.clearNavigation();

        this.interactionTrackingService.record('task:complete', formId);
        this.router.navigate(['/tasks', 'group']);
      })
      .then(() => {
        this.trackSave?.stop({
          name: [ 'enketo', 'tasks', formId, this.trackMetadata.action, 'save' ].join(':'),
          recordApdex: true,
        });
      })
      .catch((err) => {
        this.globalActions.setEnketoSavingStatus(false);
        console.error('Error submitting form data: ', err);
        this.globalActions.setEnketoError(this.translateService.instant('error.report.save'));
      });
  }

  navigationCancel() {
    this.interactionTrackingService.record('task:cancel', this.form?.config.doc.internalId);
    this.globalActions.navigationCancel();
  }

  canDeactivate(nextUrl) {
    if (!this.enketoEdited || !this.cancelCallback) {
      return true;
    }

    this.globalActions.navigationCancel(nextUrl);
    return false;
  }
}
