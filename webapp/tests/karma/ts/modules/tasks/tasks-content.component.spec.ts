import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { Observable } from 'rxjs';

import { EnketoService } from '@mm-services/enketo.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { DbService } from '@mm-services/db.service';
import { ActivatedRoute } from '@angular/router';
import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import { GlobalActions } from '@mm-actions/global';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { Selectors } from '@mm-selectors/index';
import { GeolocationService } from '@mm-services/geolocation.service';

describe('TasksContentComponent', () => {
  let tasks;
  let setEnketoEditedStatus;
  let render;
  let get;
  let XmlForms;
  let route;
  let store;
  let geolocationService;

  let compileComponent;
  let component:TasksContentComponent;
  let fixture: ComponentFixture<TasksContentComponent>;

  beforeEach(() => {
    render = sinon.stub().resolves();
    XmlForms = { get: sinon.stub().resolves() };
    get = sinon.stub().resolves({ _id: 'contact' });
    route = { params: new Observable(obs => obs.next({ id: '123' })) };
    setEnketoEditedStatus = sinon.stub(GlobalActions.prototype, 'setEnketoEditedStatus');
    geolocationService = { init: sinon.stub() };

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
        { provide: EnketoService, useValue: { render }},
        { provide: DbService, useValue: { get: () => ({ get })}},
        { provide: XmlFormsService, useValue: XmlForms },
        { provide: TelemetryService, useValue: { record: sinon.stub() }},
        { provide: GeolocationService, useValue: geolocationService },
      ],
    });

    store = TestBed.inject(MockStore);

    compileComponent = () => {
      store.overrideSelector(Selectors.getTasksList, tasks);
      return TestBed.compileComponents().then(() => {
        fixture = TestBed.createComponent(TasksContentComponent);
        component = fixture.componentInstance;
        component.ngAfterViewInit();
        fixture.detectChanges();
        return fixture.whenStable();
      });
    };
  });

  afterEach(() => {
    sinon.restore();
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
    XmlForms.get.resolves(form);
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
    XmlForms.get.resolves(form);
    await compileComponent();

    expect(get.callCount).to.eq(1);
    expect(get.args).to.deep.eq([['contact']]);

    expect(render.callCount).to.eq(1);
    expect(render.args[0][2]).to.deep.eq({
      contact: { _id: 'contact' },
      something: 'nothing',
    });
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
    XmlForms.get.resolves(form);
    await compileComponent();

    expect(get.callCount).to.eq(1);
    expect(get.args).to.deep.eq([['dne']]);

    expect(render.callCount).to.eq(1);
    expect(render.args[0][2]).to.deep.eq({ contact: { _id: 'dne' } });
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
    render.rejects('foo');
    tasks = [{
      _id: '123',
      actions: [{
        type: 'report',
        form: 'A',
        content: 'nothing'
      }]
    }];
    XmlForms.get.resolves({ id: 'myform', doc: { title: 'My Form' } });
    await compileComponent();

    expect(component.loadingForm).to.equal(false);
    expect(component.contentError).to.equal(true);
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
    XmlForms.get.resolves(form);
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
    });
  }));

});
