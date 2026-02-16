import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { expect } from 'chai';
import sinon from 'sinon';

import { TasksSidebarFilterComponent } from '@mm-modules/tasks/tasks-sidebar-filter.component';
import { TelemetryService } from '@mm-services/telemetry.service';
import { SessionService } from '@mm-services/session.service';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

describe('TasksSidebarFilterComponent', () => {
  let component: TasksSidebarFilterComponent;
  let fixture: ComponentFixture<TasksSidebarFilterComponent>;
  let store: MockStore;
  let telemetryService;
  let sessionService;
  let placeHierarchyService;

  beforeEach(async () => {
    telemetryService = { record: sinon.stub() };
    sessionService = { isOnlineOnly: sinon.stub().returns(false) };
    placeHierarchyService = {
      get: sinon.stub().resolves([]),
      getDescendants: sinon.stub().resolves([]),
    };

    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        MatIconModule,
        TasksSidebarFilterComponent,
      ],
      providers: [
        provideMockStore({
          selectors: [
            { selector: Selectors.getTasksList, value: [] },
            { selector: Selectors.getSidebarFilter, value: {} },
          ],
        }),
        { provide: TelemetryService, useValue: telemetryService },
        { provide: SessionService, useValue: sessionService },
        { provide: PlaceHierarchyService, useValue: placeHierarchyService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksSidebarFilterComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
  });

  it('should toggle sidebar filter and record telemetry', () => {
    const setSidebarFilterStub = sinon.stub(GlobalActions.prototype, 'setSidebarFilter');

    component.toggleSidebarFilter();

    expect(component.isOpen).to.be.true;
    expect(setSidebarFilterStub.calledOnce).to.be.true;
    expect(setSidebarFilterStub.args[0][0]).to.deep.equal({ isOpen: true });
    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('sidebar_filter:tasks:open');
  });

  it('should toggle sidebar filter closed and record telemetry', () => {
    component.isOpen = true;
    const setSidebarFilterStub = sinon.stub(GlobalActions.prototype, 'setSidebarFilter');

    component.toggleSidebarFilter();

    expect(component.isOpen).to.be.false;
    expect(setSidebarFilterStub.calledOnce).to.be.true;
    expect(setSidebarFilterStub.args[0][0]).to.deep.equal({ isOpen: false });
    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('sidebar_filter:tasks:close');
  });

  it('should reset filters and record telemetry', () => {
    const clearFiltersStub = sinon.stub(GlobalActions.prototype, 'clearFilters');
    const searchEmitSpy = sinon.spy(component.search, 'emit');

    component.resetFilters();

    expect(clearFiltersStub.calledOnce).to.be.true;
    expect(searchEmitSpy.calledOnce).to.be.true;
    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('sidebar_filter:tasks:reset');
  });

  it('should not reset filters when disabled', () => {
    component.disabled = true;
    const clearFiltersStub = sinon.stub(GlobalActions.prototype, 'clearFilters');

    component.resetFilters();

    expect(clearFiltersStub.called).to.be.false;
  });

  it('should apply filters, emit search, and record telemetry', () => {
    const setSidebarFilterStub = sinon.stub(GlobalActions.prototype, 'setSidebarFilter');
    const searchEmitSpy = sinon.spy(component.search, 'emit');

    component.applyFilters();

    expect(searchEmitSpy.calledOnce).to.be.true;
    expect(setSidebarFilterStub.calledOnce).to.be.true;
    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('sidebar_filter:tasks:apply');
    expect(telemetryService.record.args[0][1]).to.equal(0);
  });

  it('should record per-filter telemetry when filters are active', () => {
    sinon.stub(GlobalActions.prototype, 'setSidebarFilter');
    component.filterCount = { total: 3, overdueFilter: 1, taskTypeFilter: 2, placeFilter: 0 };
    // Mock filters with fieldIds matching filterCount keys
    (component as any).filters = [
      { fieldId: 'overdueFilter', countSelected: () => 1 },
      { fieldId: 'taskTypeFilter', countSelected: () => 2 },
      { fieldId: 'placeFilter', countSelected: () => 0 },
    ];

    component.applyFilters();

    expect(telemetryService.record.calledThrice).to.be.true;
    expect(telemetryService.record.args[0]).to.deep.equal(['sidebar_filter:tasks:apply', 3]);
    expect(telemetryService.record.args[1]).to.deep.equal(['sidebar_filter:tasks:apply:overdueFilter', 1]);
    expect(telemetryService.record.args[2]).to.deep.equal(['sidebar_filter:tasks:apply:taskTypeFilter', 2]);
  });

  it('should not apply filters when disabled', () => {
    component.disabled = true;
    const searchEmitSpy = sinon.spy(component.search, 'emit');

    component.applyFilters();

    expect(searchEmitSpy.called).to.be.false;
  });

  it('should not apply filters when resetting', () => {
    component.isResettingFilters = true;
    const searchEmitSpy = sinon.spy(component.search, 'emit');

    component.applyFilters();

    expect(searchEmitSpy.called).to.be.false;
  });

  it('should record telemetry when clearing filters', () => {
    component.clearFilters(['overdue', 'taskType']);

    expect(telemetryService.record.calledTwice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('sidebar_filter:tasks:clear:overdue');
    expect(telemetryService.record.args[1][0]).to.equal('sidebar_filter:tasks:clear:taskType');
  });

  it('should not record telemetry when clearing all filters without fieldIds', () => {
    component.clearFilters();

    expect(telemetryService.record.called).to.be.false;
  });

  it('should clear sidebar filter and filters on destroy', () => {
    const clearSidebarFilterStub = sinon.stub(GlobalActions.prototype, 'clearSidebarFilter');
    const clearFiltersStub = sinon.stub(GlobalActions.prototype, 'clearFilters');

    component.ngOnDestroy();

    expect(clearSidebarFilterStub.calledOnce).to.be.true;
    expect(clearFiltersStub.calledOnce).to.be.true;
  });
});
