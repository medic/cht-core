import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { EnketoService } from '@mm-services/enketo.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { DbService } from '@mm-services/db.service';
import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import { GlobalActions } from '@mm-actions/global';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { Selectors } from '@mm-selectors/index';
import { GeolocationService } from '@mm-services/geolocation.service';
import { TasksActions } from '@mm-actions/tasks';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';

describe('TasksContentComponent', () => {
  let tasks;
  let setEnketoEditedStatus;

  let render;
  let get;
  let xmlFormsService;
  let route;
  let store;
  let geolocationService;
  let enketoService;
  let router;
  let tasksForContactService;

  let compileComponent;
  let component: TasksContentComponent;
  let fixture: ComponentFixture<TasksContentComponent>;

  beforeEach(() => {
    render = sinon.stub().resolves();
    xmlFormsService = { get: sinon.stub().resolves() };
    get = sinon.stub().resolves({ _id: 'contact' });
    route = { params: new Observable(obs => obs.next({ id: '123' })) };
    setEnketoEditedStatus = sinon.stub(GlobalActions.prototype, 'setEnketoEditedStatus');
    geolocationService = { init: sinon.stub() };
    enketoService = { render, unload: sinon.stub(), save: sinon.stub() };
    router = { navigate: sinon.stub() };
    tasksForContactService = { getLeafPlaceAncestor: sinon.stub().resolves() };

    const mockedSelectors = [
      { selector: Selectors.getTasksLoaded, value: true },
    ];

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule,
      ],
      declarations: [
        TasksContentComponent,
        EnketoComponent,
      ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ActivatedRoute, useValue: route },
        { provide: EnketoService, useValue: enketoService },
        { provide: DbService, useValue: { get: () => ({ get })}},
        { provide: XmlFormsService, useValue: xmlFormsService },
        { provide: TelemetryService, useValue: { record: sinon.stub() }},
        { provide: GeolocationService, useValue: geolocationService },
        { provide: Router, useValue: router },
        { provide: TasksForContactService, useValue: tasksForContactService },
      ],
    });

    store = TestBed.inject(MockStore);

    compileComponent = () => {
      store.overrideSelector(Selectors.getTasksList, tasks);
      return TestBed.compileComponents().then(() => {
        fixture = TestBed.createComponent(TasksContentComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        return fixture.whenStable();
      });
    };
  });

  afterEach(() => {
    sinon.restore();
    store.resetSelectors();
  });

  it('should unsubscribe and cancel geohandle when destroyed', async () => {
    const geoHandle = { cancel: sinon.stub() };
    geolocationService.init.returns(geoHandle);
    tasks = [{
      _id: '123',
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    }];
    const form = { _id: 'myform', title: 'My Form' };
    xmlFormsService.get.resolves(form);

    await compileComponent();
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();
    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
    expect(geoHandle.cancel.callCount).to.equal(1);
  });

  it('should clear last completed task when loaded', async () => {
    const setLastSubmittedTask = sinon.stub(TasksActions.prototype, 'setLastSubmittedTask');
    await compileComponent();
    expect(setLastSubmittedTask.callCount).to.equal(1);
    expect(setLastSubmittedTask.args[0]).to.deep.equal([null]);
  });

  it('loads form when task has one action and no fields (without hydration)', async () => {
    tasks = [{
      _id: '123',
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    }];
    const form = { _id: 'myform', title: 'My Form' };
    xmlFormsService.get.resolves(form);

    await compileComponent();

    expect(component.formId).to.equal('A');

    expect(render.callCount).to.equal(1);
    expect(render.getCall(0).args.length).to.equal(5);
    expect(render.getCall(0).args[0]).to.equal('#task-report');
    expect(render.getCall(0).args[1]).to.deep.equal(form);
    expect(render.getCall(0).args[2]).to.equal('nothing');

    expect(get.callCount).to.eq(0);
    expect(setEnketoEditedStatus.callCount).to.equal(1);
    expect(setEnketoEditedStatus.args[0]).to.deep.equal([false]);
  });

  it('successful hydration', async () => {
    tasks = [{
      _id: '123',
      forId: 'contact',
      actions: [{
        type: 'report',
        form: 'A',
        content: {
          something: 'nothing',
        },
      }]
    }];
    const form = { _id: 'myform', title: 'My Form' };
    xmlFormsService.get.resolves(form);
    geolocationService.init.returns({ just: 'an object reference', cancel: sinon.stub() });

    await compileComponent();

    expect(get.callCount).to.eq(1);
    expect(get.args).to.deep.eq([['contact']]);
    expect(geolocationService.init.callCount).to.equal(1);
    expect(render.callCount).to.eq(1);
    expect(render.args[0][2]).to.deep.eq({
      contact: { _id: 'contact' },
      something: 'nothing',
      task_id: '123',
    });
  });

  it('successful hydration with existent action content', async () => {
    tasks = [{
      _id: '123',
      forId: 'contact',
      actions: [{
        type: 'report',
        form: 'A',
        content: {
          something: 'nothing',
          contact: { some: 'thing' },
        },
      }, {
        type: 'report',
        form: 'B',
        content: {
          something: 'other',
        },
      }]
    }];
    const setSelectedTask = sinon.stub(TasksActions.prototype, 'setSelectedTask');
    const form = { _id: 'myform', title: 'My Form' };
    xmlFormsService.get.resolves(form);
    geolocationService.init.returns({ just: 'an object reference', cancel: sinon.stub() });

    await compileComponent();

    expect(get.callCount).to.eq(1);
    expect(get.args).to.deep.eq([['contact']]);
    expect(render.callCount).to.eq(0);
    expect(setSelectedTask.callCount).to.equal(1);
    expect(setSelectedTask.args[0]).to.deep.equal([
      {
        _id: '123',
        forId: 'contact',
        actions: [{
          type: 'report',
          form: 'A',
          content: {
            something: 'nothing',
            contact: { some: 'thing' },
            task_id: '123',
          },
        }, {
          type: 'report',
          form: 'B',
          content: {
            something: 'other',
            contact: { _id: 'contact' },
            task_id: '123',
          },
        }]
      }
    ]);
  });

  it('unsuccessful hydration', async () => {
    get.rejects({ status: 404 });
    tasks = [{
      _id: '123',
      forId: 'dne',
      actions: [{
        type: 'report',
        form: 'A',
      }]
    }];
    const form = { _id: 'myform', title: 'My Form' };
    xmlFormsService.get.resolves(form);

    await compileComponent();

    expect(get.callCount).to.eq(1);
    expect(get.args).to.deep.eq([['dne']]);
    expect(render.callCount).to.eq(1);
    expect(render.args[0][2]).to.deep.eq({ contact: { _id: 'dne' }, task_id: '123' });
  });

  it('should work when form not found', async () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    xmlFormsService.get.rejects({ status: 404 });
    tasks = [{
      _id: '123',
      forId: 'dne',
      actions: [{
        type: 'report',
        form: 'A',
      }]
    }];

    await compileComponent();

    expect(render.callCount).to.eq(0);
    expect(component.errorTranslationKey).to.equal('error.loading.form');
    expect(component.contentError).to.equal(true);
    expect(component.loadingForm).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error loading form.');
  });

  it('does not load form when task has more than one action', async () => {
    tasks = [{
      actions: [{}, {}] // two forms
    }];

    await compileComponent();

    expect(component.formId).to.equal(null);
    expect(component.loadingForm).to.equal(undefined);
    expect(render.callCount).to.equal(0);
  });

  it('does not load form when task has fields (e.g. description)', async () => {
    tasks = [{
      actions: [{
        type: 'report',
        form: 'B'
      }],
      fields: [{
        label: [{
          content: 'Description',
          locale: 'en'
        }],
        value: [{
          content: '{{contact.name}} survey due',
          locale: 'en'
        }]
      }]
    }];

    await compileComponent();

    expect(component.formId).to.equal(null);
    expect(component.loadingForm).to.equal(undefined);
    expect(render.callCount).to.equal(0);
  });

  it('displays error if enketo fails to render', async () => {
    const consoleErrorMock = sinon.stub(console, 'error');
    render.rejects('foo');
    tasks = [{
      _id: '123',
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    }];
    xmlFormsService.get.resolves({ id: 'myform', doc: { title: 'My Form' } });

    await compileComponent();

    expect(component.loadingForm).to.equal(false);
    expect(component.contentError).to.equal(true);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error loading form.');
  });

  it('should wait for the tasks to load before setting selected task', fakeAsync(async () => {
    const notTask = {
      _id: '123',
      forId: 'contact',
      actions: [{
        type: 'report',
        form: 'B',
        content: {
          something: 'other',
        },
      }]
    };
    const form = { _id: 'myform', title: 'My Form' };
    xmlFormsService.get.resolves(form);
    store.overrideSelector(Selectors.getTasksLoaded, false);
    store.refreshState();

    await compileComponent([]);

    expect(render.callCount).to.equal(0);
    store.overrideSelector(Selectors.getTasksList, [notTask]);
    store.overrideSelector(Selectors.getTasksLoaded, true);
    store.refreshState();
    fixture.detectChanges();

    await fixture.whenStable();
    tick();

    expect(render.callCount).to.equal(1);
    expect(render.args[0][2]).to.deep.eq({
      contact: { _id: 'contact' },
      something: 'other',
      task_id: '123',
    });
  }));

  describe('perform action', () => {
    beforeEach(() => {
      sinon.stub(GlobalActions.prototype, 'setCancelCallback');
      sinon.stub(GlobalActions.prototype, 'clearNavigation');
      sinon.stub(TasksActions.prototype, 'setSelectedTask');
    });

    it('should do nothing for random action type', async () => {
      xmlFormsService.get.resolves({ id: 'myform', doc: { title: 'My Form' } });
      await compileComponent([]);
      sinon.resetHistory();
      await component.performAction(undefined);

      expect(xmlFormsService.get.callCount).to.equal(0);
      expect((<any>GlobalActions.prototype.setCancelCallback).callCount).to.equal(0);
    });

    it('should set cancel callback correctly when not skipping details', async () => {
      xmlFormsService.get.resolves({ id: 'myform', doc: { title: 'My Form' } });
      await compileComponent([]);
      sinon.resetHistory();

      component.form = 'someform';
      component.loadingForm = true;
      component.contentError = true;
      await component.performAction({});

      expect((<any>GlobalActions.prototype.setCancelCallback).callCount).to.equal(1);
      const cancelCallback = (<any>GlobalActions.prototype.setCancelCallback).args[0][0];
      expect((<any>TasksActions.prototype.setSelectedTask).callCount).to.equal(0);

      cancelCallback();

      expect((<any>TasksActions.prototype.setSelectedTask).callCount).to.equal(1);
      expect((<any>TasksActions.prototype.setSelectedTask).args[0]).to.deep.equal([null]);
      expect(enketoService.unload.callCount).to.equal(1);

      expect(component.form).to.equal(null);
      expect(component.loadingForm).to.equal(false);
      expect(component.contentError).to.equal(false);
      expect((<any>GlobalActions.prototype.clearNavigation).callCount).to.equal(1);
      expect(router.navigate.callCount).to.equal(0);
    });

    it('should set cancel callback correctly when skipping details', async () => {
      xmlFormsService.get.resolves({ id: 'myform', doc: { title: 'My Form' } });
      await compileComponent([]);
      sinon.resetHistory();

      component.form = 'someform';
      component.loadingForm = true;
      component.contentError = true;
      await component.performAction({}, true);

      expect((<any>GlobalActions.prototype.setCancelCallback).callCount).to.equal(1);
      const cancelCallback = (<any>GlobalActions.prototype.setCancelCallback).args[0][0];
      expect((<any>TasksActions.prototype.setSelectedTask).callCount).to.equal(0);

      cancelCallback();

      expect((<any>TasksActions.prototype.setSelectedTask).callCount).to.equal(1);
      expect((<any>TasksActions.prototype.setSelectedTask).args[0]).to.deep.equal([null]);
      expect(enketoService.unload.callCount).to.equal(0);

      expect(component.form).to.equal('someform');
      expect(component.loadingForm).to.equal(true);
      expect(component.contentError).to.equal(false);
      expect((<any>GlobalActions.prototype.clearNavigation).callCount).to.equal(0);

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/tasks']]);
    });

    it('should work with action of type "contact"', async () => {
      await compileComponent([]);
      sinon.resetHistory();

      const action = { type: 'contact', content: { parent_id: 'district_hospital_uuid', type: 'c_type' } };
      await component.performAction(action);

      expect(xmlFormsService.get.callCount).to.equal(0);
      expect(enketoService.render.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'district_hospital_uuid', 'add', 'c_type']]);
    });

    it('should work with action of type "contact" without parent', async () => {
      await compileComponent([]);
      sinon.resetHistory();

      const action = { type: 'contact', content: { type: 'c_type' } };
      await component.performAction(action);

      expect(xmlFormsService.get.callCount).to.equal(0);
      expect(enketoService.render.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'add', 'c_type']]);
    });

    it('should work with action of type "contact" without parent or type', async () => {
      await compileComponent([]);
      sinon.resetHistory();

      const action = { type: 'contact' };
      await component.performAction(action);

      expect(xmlFormsService.get.callCount).to.equal(0);
      expect(enketoService.render.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'add', '']]);
      expect(tasksForContactService.getLeafPlaceAncestor.callCount).to.equal(0);
    });

    it('should render form when action type is report', async () => {
      const form = { _id: 'myform', title: 'My Form' };
      const action = { type: 'report', form: 'myform', content: { contact: { _id: 'my_contact' } } };
      xmlFormsService.get.resolves({ ...form });
      tasksForContactService.getLeafPlaceAncestor.resolves({ any: 'model' });
      await compileComponent([]);

      sinon.resetHistory();
      sinon.stub(GlobalActions.prototype, 'setEnketoError');
      sinon.stub(TasksActions.prototype, 'setTaskGroupContact');
      sinon.stub(TasksActions.prototype, 'setTaskGroupContactLoading');
      store.refreshState();

      await component.performAction({ ...action });

      expect(xmlFormsService.get.callCount).to.equal(1);
      expect(xmlFormsService.get.args[0]).to.deep.equal(['myform']);
      expect(enketoService.render.callCount).to.equal(1);
      expect(enketoService.render.args[0]).to.deep.include.members([
        '#task-report',
        { ...form },
        { ...action.content },
      ]);

      expect(tasksForContactService.getLeafPlaceAncestor.callCount).to.equal(1);
      expect(tasksForContactService.getLeafPlaceAncestor.args[0]).to.deep.equal(['my_contact']);
      expect((<any>TasksActions.prototype.setTaskGroupContactLoading).callCount).to.equal(1);
      expect((<any>TasksActions.prototype.setTaskGroupContactLoading).args[0]).to.deep.equal([true]);
      await Promise.resolve();
      expect((<any>TasksActions.prototype.setTaskGroupContact).callCount).to.equal(1);
      expect((<any>TasksActions.prototype.setTaskGroupContact).args[0]).to.deep.equal([{ any: 'model' }]);
      expect((<any>TasksActions.prototype.setTaskGroupContactLoading).callCount).to.equal(1);

      const markFormEdited = enketoService.render.args[0][3];
      const resetFormError = enketoService.render.args[0][4];

      expect(setEnketoEditedStatus.callCount).to.equal(1);
      expect(setEnketoEditedStatus.args[0]).to.deep.equal([false]);
      expect((<any>GlobalActions.prototype.setEnketoError).callCount).to.equal(0);

      markFormEdited();

      expect(setEnketoEditedStatus.callCount).to.equal(2);
      expect(setEnketoEditedStatus.args[1]).to.deep.equal([true]);
      expect((<any>GlobalActions.prototype.setEnketoError).callCount).to.equal(0);

      resetFormError();

      expect((<any>GlobalActions.prototype.setEnketoError).callCount).to.equal(0);

      store.overrideSelector(Selectors.getEnketoError, 'error');
      store.refreshState();

      resetFormError();

      expect((<any>GlobalActions.prototype.setEnketoError).callCount).to.equal(1);
    });

    it('should catch contact preloading errors', async () => {
      const form = { _id: 'myform', title: 'My Form' };
      const action = { type: 'report', form: 'myform', content: { contact: { _id: 'the_contact' } } };
      xmlFormsService.get.resolves({ ...form });
      tasksForContactService.getLeafPlaceAncestor.rejects({ some: 'error' });
      await compileComponent([]);

      sinon.resetHistory();
      sinon.stub(TasksActions.prototype, 'setTaskGroupContact');
      sinon.stub(TasksActions.prototype, 'setTaskGroupContactLoading');
      sinon.stub(GlobalActions.prototype, 'setEnketoError');
      sinon.stub();
      store.refreshState();

      await component.performAction({ ...action });

      expect(xmlFormsService.get.callCount).to.equal(1);
      expect(xmlFormsService.get.args[0]).to.deep.equal(['myform']);
      expect(enketoService.render.callCount).to.equal(1);
      expect(enketoService.render.args[0]).to.deep.include.members([
        '#task-report',
        { ...form },
        { ...action.content },
      ]);

      expect(tasksForContactService.getLeafPlaceAncestor.callCount).to.equal(1);
      expect(tasksForContactService.getLeafPlaceAncestor.args[0]).to.deep.equal(['the_contact']);
      expect((<any>TasksActions.prototype.setTaskGroupContactLoading).callCount).to.equal(1);
      expect((<any>TasksActions.prototype.setTaskGroupContactLoading).args[0]).to.deep.equal([true]);
      await Promise.resolve();
      expect((<any>TasksActions.prototype.setTaskGroupContact).callCount).to.equal(1);
      expect((<any>TasksActions.prototype.setTaskGroupContactLoading).callCount).to.equal(1);
      expect((<any>TasksActions.prototype.setTaskGroupContact).args[0]).to.deep.equal([null]);

      expect(setEnketoEditedStatus.callCount).to.equal(1);
      expect(setEnketoEditedStatus.args[0]).to.deep.equal([false]);
      expect((<any>GlobalActions.prototype.setEnketoError).callCount).to.equal(0);
    });
  });

  describe('saving', () => {
    let setEnketoError;
    let setEnketoSavingStatus;
    let unsetSelected;
    let clearNavigation;
    let setLastSubmittedTask;

    beforeEach(() => {
      setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');
      setEnketoSavingStatus = sinon.stub(GlobalActions.prototype, 'setEnketoSavingStatus');
      unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      clearNavigation = sinon.stub(GlobalActions.prototype, 'clearNavigation');
      setLastSubmittedTask = sinon.stub(TasksActions.prototype, 'setLastSubmittedTask');
    });

    it('should do nothing if already saving', async () => {
      xmlFormsService.get.resolves({ id: 'myform', doc: { title: 'My Form' } });
      await compileComponent([]);

      store.overrideSelector(Selectors.getEnketoSavingStatus, true);
      store.refreshState();
      await component.save();

      expect(enketoService.save.callCount).to.equal(0);
    });

    it('should catch save errors', async () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      xmlFormsService.get.resolves({ id: 'myform', doc: { title: 'My Form' } });
      enketoService.save.rejects({ some: 'error' });
      store.overrideSelector(Selectors.getEnketoError, 'error');
      const geoHandle = { geo: 'handle', cancel: sinon.stub() };
      geolocationService.init.returns(geoHandle);
      await compileComponent([]);
      sinon.resetHistory();

      component.formId = 'the form id';
      component.form = { the: 'form' };
      const saving = component.save();

      expect(setEnketoSavingStatus.callCount).to.equal(1);
      expect(setEnketoSavingStatus.args[0]).to.deep.equal([true]);
      expect(setEnketoError.callCount).to.equal(1);
      expect(setEnketoError.args[0]).to.deep.equal([null]);

      await saving;

      expect(enketoService.save.callCount).to.equal(1);
      expect(enketoService.save.args[0]).to.deep.equal([ 'the form id', { the: 'form' }, geoHandle ]);

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args[1]).to.deep.equal([false]);
      expect(setEnketoError.callCount).to.equal(2);

      expect(setEnketoEditedStatus.callCount).to.equal(0);
      expect(enketoService.unload.callCount).to.equal(0);
      expect(clearNavigation.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
      expect(unsetSelected.callCount).to.equal(0);
      expect(setLastSubmittedTask.callCount).to.equal(0);

      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error submitting form data: ');
    });

    it('should redirect correctly after save', async () => {
      xmlFormsService.get.resolves({ id: 'myform', doc: { title: 'My Form' } });
      enketoService.save.resolves([]);
      const geoHandle = { geo: 'handle', cancel: sinon.stub() };
      geolocationService.init.returns(geoHandle);

      await compileComponent([]);
      sinon.resetHistory();

      component.formId = 'the form id';
      component.form = { the: 'form' };

      const saving = component.save();

      expect(setEnketoSavingStatus.callCount).to.equal(1);
      expect(setEnketoSavingStatus.args[0]).to.deep.equal([true]);
      expect(setEnketoError.callCount).to.equal(0);

      await saving;

      expect(enketoService.save.callCount).to.equal(1);
      expect(enketoService.save.args[0]).to.deep.equal([ 'the form id', { the: 'form' }, geoHandle ]);

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args[1]).to.deep.equal([false]);
      expect(setEnketoEditedStatus.callCount).to.equal(1);
      expect(setEnketoEditedStatus.args[0]).to.deep.equal([false]);

      expect(enketoService.unload.callCount).to.equal(1);
      expect(enketoService.unload.args[0]).to.deep.equal([{ the: 'form' }]);
      expect(clearNavigation.callCount).to.equal(1);

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/tasks', 'group']]);

      expect(setEnketoError.callCount).to.equal(0);
      expect(unsetSelected.callCount).to.equal(1);
      expect(setLastSubmittedTask.callCount).to.equal(1);
      expect(setLastSubmittedTask.args[0]).to.deep.equal([component.selectedTask]);
    });
  });

  describe('navigationCancel', () => {
    it('should call navigation cancel', () => {
      const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      component.navigationCancel();
      expect(navigationCancel.callCount).to.equal(1);
      expect(navigationCancel.args[0]).to.deep.equal([]);
    });
  });

  describe('canDeactivate', () => {
    let navigationCancel;
    beforeEach(async () => {
      navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
      await compileComponent();
    });

    it('should return true when not edited', () => {
      store.overrideSelector(Selectors.getEnketoEditedStatus, false);
      store.overrideSelector(Selectors.getCancelCallback, sinon.stub());
      store.refreshState();
      fixture.detectChanges();

      expect(component.canDeactivate('')).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);
    });

    it('should return true when no cancel callback', () => {
      store.overrideSelector(Selectors.getEnketoEditedStatus, true);
      store.overrideSelector(Selectors.getCancelCallback, null);
      store.refreshState();
      fixture.detectChanges();

      expect(component.canDeactivate('')).to.equal(true);
      expect(navigationCancel.callCount).to.equal(0);
    });

    it('should return false otherwise', () => {
      store.overrideSelector(Selectors.getEnketoEditedStatus, true);
      store.overrideSelector(Selectors.getCancelCallback, sinon.stub());
      store.refreshState();
      fixture.detectChanges();

      expect(component.canDeactivate('theurl')).to.equal(false);
      expect(navigationCancel.callCount).to.equal(1);
      expect(navigationCancel.args[0]).to.deep.equal(['theurl']);
    });
  });
});
