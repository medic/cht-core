import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';

import { ReportsComponent } from '@mm-modules/reports/reports.component';
import { ChangesService } from '@mm-services/changes.service';
import { SearchService } from '@mm-services/search.service';
import { AddReadStatusService } from '@mm-services/add-read-status.service';
import { ReportsFiltersComponent } from '@mm-modules/reports/reports-filters.component';
import { ReportsContentComponent } from '@mm-modules/reports/reports-content.component';
import { SettingsService } from '@mm-services/settings.service';
import { ReportsActions } from '@mm-actions/reports';
import { GlobalActions } from '@mm-actions/global';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { ResetFiltersComponent } from '@mm-components/filters/reset-filters/reset-filters.component';

describe('Reports Component', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let store: MockStore;
  let changesService;
  let addReadStatusService;
  let searchService;
  let listContains;

  beforeEach(async(() => {
    listContains = sinon.stub();
    const mockedSelectors = [
      { selector: 'selectedReports', value: [] },
      { selector: 'reportsList', value: []},
      { selector: 'listContains', value: listContains },
      { selector: 'forms', value: [] },
      { selector: 'filters', value: {} },
      { selector: 'showContent', value: false },
    ];


    sinon.stub(ReportsActions.prototype, 'setSelectedReports');
    sinon.stub(ReportsActions.prototype, 'updateReportsList');
    sinon.stub(GlobalActions.prototype, 'setFilter');

    TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule
        ],
        declarations: [
          ReportsComponent,
          ReportsFiltersComponent,
          ReportsContentComponent,
          NavigationComponent,
          FormTypeFilterComponent,
          FacilityFilterComponent,
          DateFilterComponent,
          StatusFilterComponent,
          FreetextFilterComponent,
          ResetFiltersComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ChangesService, useValue: { subscribe: sinon.stub().resolves(of({})) } },
          { provide: AddReadStatusService, useValue: { updateReports: sinon.stub().resolvesArg(0) }},
          { provide: SearchService, useValue: { search: sinon.stub().resolves() } },
          { provide: SettingsService, useValue: {} } // Needed because of ngx-translate provider's constructor.
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ReportsComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        addReadStatusService = TestBed.inject(AddReadStatusService);
        searchService = TestBed.inject(SearchService);
        changesService = TestBed.inject(ChangesService);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create ReportsComponent', () => {
    expect(component).to.exist;
  });

  it('ngOnInit() should watch for changes, set selected reports, search and set search filter', () => {
    changesService.subscribe.reset();
    searchService.search.reset();

    const spySubscriptionsAdd = sinon.spy(component.subscription, 'add');

    component.ngOnInit();

    expect(searchService.search.callCount).to.equal(1);
    expect(changesService.subscribe.callCount).to.equal(1);
    expect(spySubscriptionsAdd.callCount).to.equal(2);
  });

  it('listTrackBy() should return unique identifier', () => {
    const report = { _id: 'report', _rev: 'the rev', read: true, some: 'data', fields: {} };
    const otherReport = { _id: 'report2', _rev: 'the other rev', read: false, some: 'otherdata', fields: {} };

    expect(component.listTrackBy(0, report)).to.equal('reportthe revtrue');
    expect(component.listTrackBy(1, otherReport)).to.equal('report2the other revfalse');
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');
    component.ngOnDestroy();
    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

 /* describe('verifying reports', () => {
    todo enable these tests once we have verification
    const scenarios = [
      /!* User scenarios with permission to edit *!/
      { canEdit: true, initial: undefined, setTo: true, expectVerified: true, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: undefined, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: true, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: false, setTo: false, expectVerified: undefined,
        expectPost: true, expectedDate: undefined },
      { canEdit: true, initial: true, setTo: true, expectVerified: undefined,
        expectPost: true, expectedDate: undefined },

      /!* User scenarios without permission to edit *!/
      { canEdit: false, initial: undefined, setTo: false, expectVerified: false, confirm: true,
        expectPost: true, expectedDate: 0 },
      { canEdit: false, initial: undefined, setTo: true, expectVerified: undefined, confirm: false,
        expectPost: false, expectedDate: undefined },
      { canEdit: false, initial: true, setTo: false, expectVerified: true, expectPost: false, expectedDate: 0 },
      { canEdit: false, initial: false, setTo: false, expectVerified: false, expectPost: false, expectedDate: 0 },
    ];

    scenarios.forEach(scenario => {
      const { canEdit, initial, setTo, confirm, expectPost, expectedDate, expectVerified  } = scenario;
      it(`user ${canEdit ? 'can' : 'cannot'} edit, ${initial}->${setTo} yields verified:${expectVerified}`, () => {
        hasAuth = canEdit ? hasAuth.resolves(true) : hasAuth.resolves(false);
        confirm ? modal.resolves() : modal.rejects();
        post.returns(Promise.resolve());

        createController();
        reportsActions.setSelectedReports([{
          _id: 'abc',
          doc: { _id: 'def', name: 'hello', form: 'P', verified: initial },
        }]);
        scope.$broadcast('VerifyReport', setTo);
        return Q.resolve(() => {
          expect(modal.callCount).to.eq(confirm !== undefined ? 1 : 0);
          if (expectPost) {
            expect(post.callCount).to.equal(1);
            expect(post.args[0]).to.deep.equal([{
              _id: 'def',
              name: 'hello',
              form: 'P',
              rev: '1',
              verified_date: expectedDate,
              verified: expectVerified,
            }]);
          } else {
            expect(post.called).to.be.false;
          }
        });
      });
    });
  });*/

  describe('Changes listener', () => {
    it('filters reports', () => {
      expect(changesService.subscribe.callCount).to.equal(1);
      const changesFilter = changesService.subscribe.args[0][0];
      const change = { doc: { form: 'something' } };
      expect(!!changesFilter(change)).to.equal(true);
    });

    it('filters deletions', () => {
      listContains.returns(true);
      const changesFilter = changesService.subscribe.args[0][0];
      const change = { deleted: true, id: 'some_id' };
      expect(!!changesFilter(change)).to.equal(true);
      expect(listContains.callCount).to.equal(1);
      expect(listContains.contains.args[0]).to.deep.equal(['some_id']);
    });

    it('filters everything else', () => {
      const changesFilter = changesService.subscribe.args[0][0];
      expect(!!changesFilter({ doc: { some: 'thing' } })).to.equal(false);
    });

    it('removes deleted reports from the list', () => {
      searchService.search.reset();
      const changesCallback = changesService.subscribe.args[0][1];
      const removeReportFromList = sinon.stub(ReportsActions.prototype, 'removeReportFromList');

      changesCallback({ deleted: true, id: 'id' });
      expect(removeReportFromList.callCount).to.equal(1);
      expect(removeReportFromList.args[0]).to.deep.equal([{ _id: 'id' }]);
      expect(searchService.search.callCount).to.equal(0);
    });

    it('refreshes list', () => {
      searchService.search.reset();
      const changesCallback = changesService.subscribe.args[0][1];
      const removeReportFromList = sinon.stub(ReportsActions.prototype, 'removeReportFromList');

      changesCallback({ doc: { _id: 'id' } });
      expect(removeReportFromList.callCount).to.equal(0);
      expect(searchService.search.callCount).to.equal(1);
    });
  });

});



/*
describe('ReportsCtrl controller', () => {

  'use strict';

  let createController;
  let scope;
  let globalActions;
  let reportsActions;
  let report;
  let get;
  let post;
  let hasAuth;
  let modal;
  let LiveList;
  let MarkRead;
  let PlaceHierarchy;
  let Search;
  let Changes;
  let FormatDataRecord;
  let changesCallback;
  let changesFilter;
  let searchFilters;
  let liveListReset;

  beforeEach(() => {
    module('inboxApp');

    get = sinon.stub();
    post = sinon.stub();
    const DB = KarmaUtils.mockDB({ get, post, info: sinon.stub() })();

    liveListReset = sinon.stub();
    LiveList = {
      reports: {
        initialised: () => true,
        setSelected: sinon.stub(),
        remove: sinon.stub(),
        count: sinon.stub(),
        set: sinon.stub(),
        contains: sinon.stub()
      },
      'report-search': {
        set: sinon.stub()
      },
      $reset: liveListReset
    };
    KarmaUtils.setupMockStore(null, { DB, LiveList });
  });

  beforeEach(inject(($rootScope, $controller, $ngRedux, GlobalActions, ReportsActions) => {
    scope = $rootScope.$new();
    scope.filterModel = { date: {} };
    report = { _id: 'x' };
    scope.readStatus = { forms: 0, messages: 0 };
    scope.updateReadStatus = () => {};
    scope.isRead = () => true;
    scope.reports = [ report, { _id: 'a' } ];
    scope.clearSelected = () => {};
    scope.setBackTarget = () => {};
    scope.isMobile = () => false;

    globalActions = Object.assign({}, GlobalActions($ngRedux.dispatch), {
      setRightActionBar: sinon.stub()
    });
    reportsActions = ReportsActions($ngRedux.dispatch);
    scope.setTitle = () => {};
    scope.setRightActionBar = sinon.stub();
    scope.setLeftActionBar = sinon.stub();
    scope.settingSelected = () => {};

    hasAuth = sinon.stub().resolves(true);
    modal = sinon.stub().resolves();

    MarkRead = () => {};
    FormatDataRecord = data => {
      return {
        then: cb => {
          cb(data);
          return {
            catch: () => {}
          };
        }
      };
    };

    Search = sinon.stub().resolves();
    PlaceHierarchy = sinon.stub().resolves([]);

    Changes = sinon.stub().callsFake(options => {
      changesCallback = options.callback;
      changesFilter = options.filter;
      return { unsubscribe: () => {} };
    });

    changesCallback = undefined;
    changesFilter = undefined;

    searchFilters = { destroy: sinon.stub() };

    sinon.stub(Date, 'now').returns(0);

    createController = () => {
      return $controller('ReportsCtrl', {
        '$q': Q,
        '$scope': scope,
        '$translate': { instant: () => {} },
        AddReadStatus: () => {},
        Auth: {
          has: hasAuth,
        },
        Changes: Changes,
        DeleteDocs: {},
        EditGroup: {},
        Export: () => {},
        FormatDataRecord: FormatDataRecord,
        GlobalActions: () => globalActions,
        MarkRead: MarkRead,
        MessageState: {},
        Modal: modal,
        PlaceHierarchy: PlaceHierarchy,
        ReportViewModelGenerator: {},
        ReportsActions: () => reportsActions,
        Search: Search,
        SearchFilters: searchFilters,
        Settings: KarmaUtils.nullPromise(),
        Tour: () => {},
        UpdateFacility: {},
        Verified: {}
      });
    };
  }));

  afterEach(() => sinon.restore());




  describe('destroy', () => {
    it('should reset liveList and destroy search filters when destroyed', () => {
      createController();
      scope.$destroy();
      expect(liveListReset.callCount).to.equal(1);
      expect(liveListReset.args[0]).to.deep.equal(['reports', 'report-search']);
      expect(searchFilters.destroy.callCount).to.equal(1);
    });
  });
});
*/
