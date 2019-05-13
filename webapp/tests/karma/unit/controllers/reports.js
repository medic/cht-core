describe('ReportsCtrl controller', () => {

  'use strict';

  let createController,
      scope,
      actions,
      report,
      get,
      post,
      auth,
      modal,
      LiveList,
      MarkRead,
      Search,
      Changes,
      FormatDataRecord,
      changesCallback,
      changesFilter,
      searchFilters,
      liveListInit,
      liveListReset;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject(($rootScope, $controller, $ngRedux, Actions) => {
    get = sinon.stub();
    post = sinon.stub();
    scope = $rootScope.$new();
    scope.filterModel = { date: {} };
    report = { _id: 'x' };
    scope.readStatus = { forms: 0, messages: 0 };
    scope.updateReadStatus = () => {};
    scope.isRead = () => true;
    scope.setFilterQuery = () => {};
    scope.reports = [ report, { _id: 'a' } ];
    scope.clearSelected = () => {};
    scope.setBackTarget = () => {};
    scope.isMobile = () => false;
    scope.setTitle = () => {};
    scope.setRightActionBar = sinon.stub();
    scope.setLeftActionBar = sinon.stub();
    scope.settingSelected = () => {};
    scope.setLoadingSubActionBar = sinon.stub();

    actions = Actions($ngRedux.dispatch);
    auth = sinon.stub().resolves();
    modal = sinon.stub().resolves();
    liveListInit = sinon.stub();
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
      $init: liveListInit,
      $reset: liveListReset
    };
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
        Auth: auth,
        Changes: Changes,
        DB: KarmaUtils.mockDB({ get, post })(),
        DeleteDocs: {},
        EditGroup: {},
        Export: () => {},
        FormatDataRecord: FormatDataRecord,
        LiveList: LiveList,
        MarkRead: MarkRead,
        MessageState: {},
        Modal: modal,
        ReportViewModelGenerator: {},
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

  it('set up controller', () => {
    createController();
    chai.expect(liveListInit.called, true);
    chai.expect(liveListInit.args[0]).to.deep.equal([scope, 'reports', 'report-search']);
  });

  it('when selecting a report, it sets the phone number in the actionbar', done => {
    const phone = 12345;
    get.returns(Promise.resolve({ _id: 'def', name: 'hello', phone: phone }));
    post.returns(Promise.resolve());
    createController();
    const report = { doc: {
      _id: 'abc',
      form: 'P',
      contact: { _id: 'def' }
    }};
    scope.setSelected(report);
    setTimeout(() => { // timeout to let the DB query finish
      chai.expect(scope.setRightActionBar.callCount).to.equal(1);
      chai.expect(scope.setRightActionBar.args[0][0].sendTo.phone).to.equal(phone);
      done();
    });
  });

  describe('verifying reports', () => {
    const scenarios = [
      /* User scenarios with permission to edit */
      { canEdit: true, initial: undefined, setTo: true, expectVerified: true, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: undefined, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: true, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: false, setTo: false, expectVerified: undefined, expectPost: true, expectedDate: undefined },
      { canEdit: true, initial: true, setTo: true, expectVerified: undefined, expectPost: true, expectedDate: undefined },

      /* User scenarios without permission to edit */
      { canEdit: false, initial: undefined, setTo: false, expectVerified: false, confirm: true, expectPost: true, expectedDate: 0 },
      { canEdit: false, initial: undefined, setTo: true, expectVerified: undefined, confirm: false, expectPost: false, expectedDate: undefined },
      { canEdit: false, initial: true, setTo: false, expectVerified: true, expectPost: false, expectedDate: 0 },
      { canEdit: false, initial: false, setTo: false, expectVerified: false, expectPost: false, expectedDate: 0 },
    ];

    scenarios.forEach(scenario => {
      const { canEdit, initial, setTo, confirm, expectPost, expectedDate, expectVerified  } = scenario;
      it(`user ${canEdit ? 'can' : 'cannot'} edit, verified:${initial}->${setTo} yields verified:${expectVerified}`, () => {
        auth = canEdit ? sinon.stub().resolves() : sinon.stub().rejects();
        confirm ? modal.resolves() : modal.rejects();
        post.returns(Promise.resolve());

        createController();
        actions.setSelected([{
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

      return Promise.resolve().then(() => {
        changesCallback({ deleted: true, id: 'id' });
        chai.expect(LiveList.reports.remove.callCount).to.equal(1);
        chai.expect(LiveList.reports.remove.args[0]).to.deep.equal(['id']);
        chai.expect(Search.callCount).to.equal(0);
      });
    });

    it('refreshes list', () => {
      createController();

      return Promise.resolve().then(() => {
        changesCallback({ doc: { _id: 'id' } });
        chai.expect(LiveList.reports.remove.callCount).to.equal(0);
        chai.expect(Search.callCount).to.equal(1);
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
