import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subject, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { FormService } from '@mm-services/form.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { GlobalActions } from '@mm-actions/global';
import { TasksActions } from '@mm-actions/tasks';
import { Selectors } from '@mm-selectors/index';
import { GeolocationService } from '@mm-services/geolocation.service';
import { DbService } from '@mm-services/db.service';
import { TranslateService } from '@mm-services/translate.service';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';

@Component({
  templateUrl: './tasks-content.component.html'
})
export class TasksContentComponent implements OnInit, OnDestroy {
  constructor(
    private translateService:TranslateService,
    private route:ActivatedRoute,
    private store:Store,
    private formService:FormService,
    private telemetryService:TelemetryService,
    private translateFromService:TranslateFromService,
    private xmlFormsService:XmlFormsService,
    private geolocationService:GeolocationService,
    private dbService:DbService,
    private router:Router,
    private tasksForContactService:TasksForContactService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.tasksActions = new TasksActions(store);
  }

  subscription = new Subscription();
  private globalActions;
  private tasksActions;

  enketoStatus;
  private enketoEdited;
  loadingContent;
  selectedTask: any = null;
  form;
  loadingForm;
  contentError;
  formId;
  private cancelCallback;
  errorTranslationKey;
  private tasksList;
  private geoHandle;
  private telemetryData:any;
  private enketoError;
  private enketoSaving;
  private viewInited = new Subject();

  ngOnInit() {
    this.telemetryData = { preRender: Date.now() };
    this.subscribeToStore();
    this.subscribeToRouteParams();

    this.form = null;
    this.formId = null;
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

  private hydrateTaskEmission(task) {
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

    return this.dbService
      .get()
      .get(task.forId)
      .catch(err => {
        if (err.status !== 404) {
          throw err;
        }

        console.info('Failed to hydrate contact information in task action', err);
        return { _id: task.forId };
      })
      .then(contactDoc => {
        return setActionsContacts(task, contactDoc);
      });
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

  private renderForm(action, formDoc) {
    this.globalActions.setEnketoEditedStatus(false);
    const markFormEdited = this.markFormEdited.bind(this);
    const resetFormError = this.resetFormError.bind(this);

    return this.formService
      .render('#task-report', formDoc, action.content, markFormEdited, resetFormError)
      .then((formInstance) => {
        this.form = formInstance;
        this.loadingForm = false;
        if (formDoc?.translation_key) {
          this.globalActions.setTitle(this.translateService.instant(formDoc.translation_key));
        } else {
          this.globalActions.setTitle(this.translateFromService.get(formDoc?.title));
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
        this.tasksActions.setSelectedTask(null);
        this.formService.unload(this.form);
        this.form = null;
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
      this.loadingForm = true;
      this.formId = action.form;
      return this.xmlFormsService
        .get(action.form)
        .then((formDoc) => this.renderForm(action, formDoc))
        .then(() => {
          this.telemetryData.postRender = Date.now();
          this.telemetryData.action = action.content.doc ? 'edit' : 'add';
          this.telemetryData.form = this.formId;

          this.telemetryService.record(
            `enketo:tasks:${this.telemetryData.form}:${this.telemetryData.action}:render`,
            this.telemetryData.postRender - this.telemetryData.preRender
          );
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
      if (action.content?.parent_id) {
        this.router.navigate(['/contacts', action.content.parent_id, 'add', action.content.type || '']);
      } else {
        this.router.navigate(['/contacts', 'add', action.content?.type || '']);
      }
    }
  }

  save() {
    if (this.enketoSaving) {
      console.debug('Attempted to call tasks-content.component:save more than once');
      return;
    }

    this.telemetryData.preSave = Date.now();

    this.telemetryService.record(
      `enketo:tasks:${this.telemetryData.form}:${this.telemetryData.action}:user_edit_time`,
      this.telemetryData.preSave - this.telemetryData.postRender
    );

    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();

    return this.formService
      .save(this.formId, this.form, this.geoHandle)
      .then((docs) => {
        console.debug('saved report and associated docs', docs);
        this.globalActions.setSnackbarContent(this.translateService.instant('report.created'));

        this.tasksActions.setLastSubmittedTask(this.selectedTask);
        this.globalActions.setEnketoSavingStatus(false);
        this.globalActions.setEnketoEditedStatus(false);
        this.formService.unload(this.form);
        this.globalActions.unsetSelected();
        this.globalActions.clearNavigation();

        this.router.navigate(['/tasks', 'group']);
      })
      .then(() => {
        this.telemetryData.postSave = Date.now();

        this.telemetryService.record(
          `enketo:tasks:${this.telemetryData.form}:${this.telemetryData.action}:save`,
          this.telemetryData.postSave - this.telemetryData.preSave
        );
      })
      .catch((err) => {
        this.globalActions.setEnketoSavingStatus(false);
        console.error('Error submitting form data: ', err);
        this.globalActions.setEnketoError(this.translateService.instant('error.report.save'));
      });
  }

  navigationCancel() {
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
