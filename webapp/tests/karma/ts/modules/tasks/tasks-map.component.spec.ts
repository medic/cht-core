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
import { GeolocationService } from '@mm-services/geolocation.service';
import { MapTilesPrefetchService } from '@mm-services/map-tiles-prefetch.service';
import { TasksMapComponent } from '@mm-modules/tasks/tasks-map.component';

describe('TasksMapComponent', () => {
  let fixture;
  let component;
  let store: MockStore;
  let router;
  let translateService;
  let geolocationService;
  let geoHandle;
  let resolveUserLocation;
  let mapTilesPrefetchService;
  let style;

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

  const locateUser = async (position) => {
    resolveUserLocation(position);
    await geolocationService.currentPromise;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    // no stylesheets are loaded in tests: without a fixed height Leaflet's panes resize the container on every
    // render, which trips the browser's ResizeObserver loop detection
    style = document.createElement('style');
    style.textContent = '.map-container .map { width: 400px; height: 400px; }';
    document.head.appendChild(style);

    translateService = {
      instant: sinon.stub().callsFake((key, params) => params ? `${key}:${JSON.stringify(params)}` : key),
    };
    geoHandle = { cancel: sinon.stub() };
    geolocationService = {
      init: sinon.stub().returns(geoHandle),
      currentPromise: new Promise(resolve => resolveUserLocation = resolve),
    };
    mapTilesPrefetchService = { getUserFacilityGeolocations: sinon.stub().resolves([]) };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule,
        TasksMapComponent,
      ],
      providers: [
        provideMockStore(),
        { provide: TranslateService, useValue: translateService },
        { provide: GeolocationService, useValue: geolocationService },
        { provide: MapTilesPrefetchService, useValue: mapTilesPrefetchService },
      ],
    });

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    sinon.stub(router, 'navigate');
  });

  afterEach(() => {
    style.remove();
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
    expect(geolocationService.init.callCount).to.equal(1);
  });

  it('should send the mobile back button to the tasks list, and clear navigation on destroy', async () => {
    const setNavigation = sinon.stub(GlobalActions.prototype, 'setNavigation');
    const clearNavigation = sinon.stub(GlobalActions.prototype, 'clearNavigation');

    await render();

    expect(setNavigation.callCount).to.equal(1);
    setNavigation.args[0][0].cancelCallback();
    expect(router.navigate.args).to.deep.equal([[['/tasks']]]);

    component.ngOnDestroy();
    expect(clearNavigation.callCount).to.equal(1);
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
        badge: 'Jane - Visit',
        className: 'overdue',
        data: tasks[0],
      },
      {
        geolocation: { latitude: -1.31, longitude: 36.79 },
        label: 'John - Follow up',
        badge: 'John - Follow up',
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

  describe('distance from the user', () => {
    it('should badge the patient and task type, and add the distance to the label once located', async () => {
      await render({ tasksList: tasks });
      // the badge is the patient and task type, shown regardless of location
      expect(component.markers.map(marker => marker.badge)).to.deep.equal(['Jane - Visit', 'John - Follow up']);
      expect(component.markers.map(marker => marker.label)).to.deep.equal(['Jane - Visit', 'John - Follow up']);
      expect(getElement('.user-location')).to.equal(undefined);

      const position = { latitude: -1.2921, longitude: 36.8219, accuracy: 10 };
      await locateUser(position);

      expect(component.userLocation).to.deep.equal(position);
      expect(getElement('.user-location')).to.not.equal(undefined);
      // distance is added to the hover label, the badge stays the patient and task type
      expect(component.markers.map(marker => marker.label)).to.deep.equal([
        'Jane - Visit - tasks.map.distance.m:{"DISTANCE":315}',
        'John - Follow up - tasks.map.distance.km:{"DISTANCE":"4.1"}',
      ]);
      expect(component.markers.map(marker => marker.badge)).to.deep.equal(['Jane - Visit', 'John - Follow up']);
      const badges = fixture.debugElement.queryAll(By.css('.map-marker .map-marker-badge'));
      expect(badges.map(badge => badge.nativeElement.innerText)).to.deep.equal(['Jane - Visit', 'John - Follow up']);
    });

    it('should round distances of 10km or more to whole kilometers', async () => {
      await render({ tasksList: [tasks[0]] });
      await locateUser({ latitude: -1.2921, longitude: 36.9719 });

      expect(component.markers[0].label).to.equal('Jane - Visit - tasks.map.distance.km:{"DISTANCE":17}');
    });

    it('should keep distances when the task list changes', async () => {
      await render({ tasksList: [tasks[0]] });
      await locateUser({ latitude: -1.2921, longitude: 36.8219 });

      store.overrideSelector(Selectors.getFilteredTasksList, tasks);
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.markers.map(marker => marker.label)).to.deep.equal([
        'Jane - Visit - tasks.map.distance.m:{"DISTANCE":315}',
        'John - Follow up - tasks.map.distance.km:{"DISTANCE":"4.1"}',
      ]);
    });

    it('should show neither the user nor distances when the location cannot be determined', async () => {
      await render({ tasksList: tasks });
      await locateUser({ code: 1, message: 'User denied Geolocation' });

      expect(component.userLocation).to.equal(undefined);
      expect(getElement('.user-location')).to.equal(undefined);
      expect(component.markers.map(marker => marker.label)).to.deep.equal(['Jane - Visit', 'John - Follow up']);
      expect(component.markers.map(marker => marker.badge)).to.deep.equal(['Jane - Visit', 'John - Follow up']);
    });

    it('should cancel the geolocation handle on destroy', async () => {
      await render({ tasksList: tasks });

      component.ngOnDestroy();

      expect(geoHandle.cancel.callCount).to.equal(1);
    });
  });

  describe('map center', () => {
    it('should center the map on the facility', async () => {
      const facility = { latitude: -1.3, longitude: 36.8, accuracy: 5 };
      mapTilesPrefetchService.getUserFacilityGeolocations.resolves([facility]);

      await render({ tasksList: tasks });

      expect(component.center).to.deep.equal(facility);
    });

    it('should leave the map to fit the markers when the facility has no location', async () => {
      await render({ tasksList: tasks });
      expect(component.center).to.equal(undefined);
    });

    it('should tolerate failures when getting the facility', async () => {
      mapTilesPrefetchService.getUserFacilityGeolocations.rejects(new Error('boom'));
      await render({ tasksList: tasks });
      expect(component.center).to.equal(undefined);
      expect(component.markers.length).to.equal(2);
    });
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
