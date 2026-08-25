import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { expect } from 'chai';
import sinon from 'sinon';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { TranslateService } from '@mm-services/translate.service';
import { TasksMapComponent } from '@mm-modules/tasks/tasks-map.component';

describe('TasksMapComponent', () => {
  let fixture;
  let component;
  let store: MockStore;
  let router;
  let translateService;

  const tasks: any[] = [
    {
      _id: 'task1',
      title: 'Visit',
      overdue: true,
      contact: { name: 'Jane' },
      geolocation: { latitude: -1.29, longitude: 36.82 },
    },
    {
      _id: 'task2',
      title: 'Follow up',
      overdue: false,
      contact: { name: 'John' },
      geolocation: { latitude: -1.31, longitude: 36.79 },
    },
    { _id: 'task3', title: 'No location', contact: { name: 'Jim' } },
    { _id: 'task4', title: 'No location either' },
  ];

  const getElement = (cssSelector) => {
    return fixture.debugElement.query(By.css(cssSelector))?.nativeElement;
  };

  const render = async ({ loaded = true, tasksList = <any[]>[] } = {}) => {
    store.overrideSelector(Selectors.getTasksLoaded, loaded);
    store.overrideSelector(Selectors.getFilteredTasksList, tasksList);
    fixture = TestBed.createComponent(TasksMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    translateService = { instant: sinon.stub().returnsArg(0) };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule,
        TasksMapComponent,
      ],
      providers: [
        provideMockStore(),
        { provide: TranslateService, useValue: translateService },
      ],
    });

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    sinon.stub(router, 'navigate');
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should show content and set the title on init', async () => {
    const setShowContent = sinon.stub(GlobalActions.prototype, 'setShowContent');
    const setTitle = sinon.stub(GlobalActions.prototype, 'setTitle');

    await render();

    expect(setShowContent.args).to.deep.equal([[true]]);
    expect(translateService.instant.args).to.deep.equal([['tasks.map.title']]);
    expect(setTitle.args).to.deep.equal([['tasks.map.title']]);
  });

  it('should show a loader while tasks are loading', async () => {
    await render({ loaded: false, tasksList: tasks });

    expect(getElement('.empty-selection .loader')).to.not.equal(undefined);
    expect(getElement('mm-map')).to.equal(undefined);
  });

  it('should show a message when no task has a location', async () => {
    await render({ tasksList: [tasks[2], tasks[3]] });

    expect(getElement('.empty-selection').innerText.trim()).to.equal('tasks.map.empty');
    expect(getElement('mm-map')).to.equal(undefined);
    expect(component.tasksWithoutLocation).to.equal(2);
  });

  it('should render a marker for every task with a location and count the rest', async () => {
    await render({ tasksList: tasks });

    expect(component.markers).to.deep.equal([
      {
        geolocation: { latitude: -1.29, longitude: 36.82 },
        label: 'Jane - Visit',
        className: 'overdue',
        data: tasks[0],
      },
      {
        geolocation: { latitude: -1.31, longitude: 36.79 },
        label: 'John - Follow up',
        className: undefined,
        data: tasks[1],
      },
    ]);
    expect(component.tasksWithoutLocation).to.equal(2);

    expect(getElement('mm-map .leaflet-container')).to.not.equal(undefined);
    expect(fixture.debugElement.queryAll(By.css('.leaflet-marker-icon.map-marker')).length).to.equal(2);
    expect(getElement('.tasks-without-location').innerText.trim()).to.equal('tasks.map.without.location');
  });

  it('should not show the count when every task has a location', async () => {
    await render({ tasksList: [tasks[0], tasks[1]] });

    expect(component.tasksWithoutLocation).to.equal(0);
    expect(getElement('.tasks-without-location')).to.equal(undefined);
  });

  it('should update markers when the task list changes', async () => {
    await render({ tasksList: [tasks[0]] });
    expect(component.markers.length).to.equal(1);

    store.overrideSelector(Selectors.getFilteredTasksList, tasks);
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.markers.length).to.equal(2);
    expect(fixture.debugElement.queryAll(By.css('.leaflet-marker-icon.map-marker')).length).to.equal(2);
  });

  it('should navigate to the task when a marker is clicked', async () => {
    await render({ tasksList: tasks });

    fixture.debugElement
      .queryAll(By.css('.leaflet-marker-icon.map-marker'))[1]
      .nativeElement
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(router.navigate.args).to.deep.equal([[['/tasks', 'task2']]]);
  });

  it('should unsubscribe and hide content on destroy', async () => {
    await render({ tasksList: tasks });
    const setShowContent = sinon.stub(GlobalActions.prototype, 'setShowContent');
    const unsubscribe = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribe.callCount).to.equal(1);
    expect(setShowContent.args).to.deep.equal([[false]]);
  });
});
