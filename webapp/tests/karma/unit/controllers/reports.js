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

  describe('verifying reports', () => {
    const scenarios = [
      /* User scenarios with permission to edit */
      { canEdit: true, initial: undefined, setTo: true, expectVerified: true, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: undefined, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: true, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: false, setTo: false, expectVerified: undefined,
        expectPost: true, expectedDate: undefined },
      { canEdit: true, initial: true, setTo: true, expectVerified: undefined,
        expectPost: true, expectedDate: undefined },

      /* User scenarios without permission to edit */
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
          chai.expect(modal.callCount).to.eq(confirm !== undefined ? 1 : 0);
          if (expectPost) {
            chai.expect(post.callCount).to.equal(1);
            chai.expect(post.args[0]).to.deep.equal([{
              _id: 'def',
              name: 'hello',
              form: 'P',
              rev: '1',
              verified_date: expectedDate,
              verified: expectVerified,
            }]);
          } else {
            chai.expect(post.called).to.be.false;
          }
        });
      });
    });
  });

  describe('Changes listener', () => {
    it('subscribes to changes', () => {
      createController();
      return Promise.resolve().then(() => {
        chai.expect(Changes.callCount).to.equal(1);
      });
    });

    it('filters reports', () => {
      createController();

      return Promise.resolve().then(() => {
        const change = { doc: { form: 'something' } };
        chai.expect(!!changesFilter(change)).to.equal(true);
      });
    });

    it('filters deletions', () => {
      createController();
      LiveList.reports.contains.returns(true);
      return Promise.resolve().then(() => {
        const change = { deleted: true, id: 'some_id' };
        chai.expect(!!changesFilter(change)).to.equal(true);
        chai.expect(LiveList.reports.contains.callCount).to.equal(1);
        chai.expect(LiveList.reports.contains.args[0]).to.deep.equal(['some_id']);
      });
    });

    it('filters everything else', () => {
      createController();

      return Promise.resolve().then(() => {
        chai.expect(!!changesFilter({ doc: { some: 'thing' } })).to.equal(false);
      });
    });

    it('removes deleted reports from the list', () => {
      createController();
      const searchBaseline = Search.callCount;

      return Promise.resolve().then(() => {
        changesCallback({ deleted: true, id: 'id' });
        chai.expect(LiveList.reports.remove.callCount).to.equal(1);
        chai.expect(LiveList.reports.remove.args[0]).to.deep.equal(['id']);
        chai.expect(Search.callCount).to.equal(searchBaseline);
      });
    });

    it('minifies deleted reports', () => {
      createController();

      return Promise.resolve().then(() => {
        changesCallback({ deleted: true, id: 'id', patient: {} });
        chai.expect(LiveList.reports.remove.args[0]).to.not.have.key('patient');
      });
    });

    it('refreshes list', () => {
      createController();
      const searchBaseline = Search.callCount;

      return Promise.resolve().then(() => {
        changesCallback({ doc: { _id: 'id' } });
        chai.expect(LiveList.reports.remove.callCount).to.equal(0);
        chai.expect(Search.callCount).to.equal(searchBaseline + 1);
      });
    });
  });

  describe('destroy', () => {
    it('should reset liveList and destroy search filters when destroyed', () => {
      createController();
      scope.$destroy();
      chai.expect(liveListReset.callCount).to.equal(1);
      chai.expect(liveListReset.args[0]).to.deep.equal(['reports', 'report-search']);
      chai.expect(searchFilters.destroy.callCount).to.equal(1);
    });
  });
});
