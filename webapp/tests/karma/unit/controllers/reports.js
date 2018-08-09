describe('ReportsCtrl controller', () => {

  'use strict';

  let createController,
      scope,
      report,
      get,
      post,
      LiveList,
      UserDistrict,
      MarkRead,
      Search,
      Changes,
      FormatDataRecord,
      changesCallback,
      changesFilter;

  beforeEach(module('inboxApp'));

  beforeEach(inject(($rootScope, $controller) => {
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
    UserDistrict = () => {
      return { then: () => {} };
    };
    LiveList = { reports: {
      initialised: () => true,
      setSelected: sinon.stub(),
      containsDeleteStub: sinon.stub(),
      remove: sinon.stub(),
      count: sinon.stub()
    }};
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

    createController = () => {
      return $controller('ReportsCtrl', {
        '$scope': scope,
        'AddReadStatus': () => {},
        'Changes': Changes,
        'DB': KarmaUtils.mockDB({ get: get, post: post })(),
        'DeleteDocs': {},
        'EditGroup': {},
        'Export': () => {},
        'FormatDataRecord': FormatDataRecord,
        'LiveList': LiveList,
        'MarkRead': MarkRead,
        'MessageState': {},
        'ReportViewModelGenerator': {},
        'Search': Search,
        'SearchFilters': () => {},
        'Settings': KarmaUtils.nullPromise(),
        'Tour': () => {},
        'UpdateFacility': {},
        'UserDistrict': UserDistrict,
        'Verified': {}
      });
    };
  }));

  it('set up controller', () => {
    createController();
  });

  it('when selecting a report, it sets the phone number in the actionbar', done => {
    const phone = 12345;
    get.returns(Promise.resolve({ _id: 'def', name: 'hello', phone: phone }));
    post.returns(Promise.resolve());
    createController();
    scope.setSelected({ doc: {
      _id: 'abc',
      form: 'P',
      contact: { _id: 'def' }
    }});
    setTimeout(() => { // timeout to let the DB query finish
      chai.expect(scope.setRightActionBar.callCount).to.equal(1);
      chai.expect(scope.setRightActionBar.args[0][0].sendTo.phone).to.equal(phone);
      done();
    });
  });

  describe('verifying reports', () => {
    it('unverified report to verified - valid', () => {
      get.returns(Promise.resolve({ _id: 'def', name: 'hello' }));
      post.returns(Promise.resolve());

      createController();
      scope.selected[0] = {
        _id: 'abc',
        doc: { form: 'P' }
      };
      scope.$broadcast('VerifyReport', true);
      return Promise.resolve().then(() => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0]).to.deep.equal(['abc']);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0]).to.deep.equal([{
          _id: 'def',
          name: 'hello',
          verified: true,
        }]);
      });
    });

    it('unverified report to verified - invalid', () => {
      get.returns(Promise.resolve({ _id: 'def', name: 'hello' }));
      post.returns(Promise.resolve());

      createController();
      scope.selected[0] = {
        _id: 'abc',
        doc: { form: 'P' }
      };
      scope.$broadcast('VerifyReport', false);
      return Promise.resolve().then(() => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0]).to.deep.equal(['abc']);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0]).to.deep.equal([{
          _id: 'def',
          name: 'hello',
          verified: false
        }]);
      });
    });

    it('verified valid to verified invalid', () => {
      get.returns(Promise.resolve({
        _id: 'def',
        name: 'hello',
        verified: true
      }));
      post.returns(Promise.resolve());

      createController();
      scope.selected[0] = {
        _id: 'abc',
        doc: { form: 'P' }
      };
      scope.$broadcast('VerifyReport', false);
      return Promise.resolve().then(() => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0]).to.deep.equal(['abc']);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0]).to.deep.equal([{
          _id: 'def',
          name: 'hello',
          verified: false
        }]);
      });
    });

    it('verified invalid to unverified', () => {
      get.returns(Promise.resolve({
        _id: 'def',
        name: 'hello',
        verified: false
      }));
      post.returns(Promise.resolve());

      createController();
      scope.selected[0] = {
        _id: 'abc',
        doc: { form: 'P' }
      };
      scope.$broadcast('VerifyReport', false);
      return Promise.resolve().then(() => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0]).to.deep.equal(['abc']);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0]).to.deep.equal([{
          _id: 'def',
          name: 'hello',
          verified: undefined
        }]);
      });
    });

    it('verified invalid to verified valid', () => {
      get.returns(Promise.resolve({
        _id: 'def',
        name: 'hello',
        verified: false
      }));
      post.returns(Promise.resolve());

      createController();
      scope.selected[0] = {
        _id: 'abc',
        doc: { form: 'P' }
      };
      scope.$broadcast('VerifyReport', true);
      return Promise.resolve().then(() => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0]).to.deep.equal(['abc']);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0]).to.deep.equal([{
          _id: 'def',
          name: 'hello',
          verified: true
        }]);
      });
    });

    it('verified valid to unverified', () => {
      get.returns(Promise.resolve({
        _id: 'def',
        name: 'hello',
        verified: true
      }));
      post.returns(Promise.resolve());

      createController();
      scope.selected[0] = {
        _id: 'abc',
        doc: { form: 'P' }
      };
      scope.$broadcast('VerifyReport', true);
      return Promise.resolve().then(() => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0]).to.deep.equal(['abc']);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0]).to.deep.equal([{
          _id: 'def',
          name: 'hello',
          verified: undefined
        }]);
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
        chai.expect(LiveList.reports.containsDeleteStub.callCount).to.equal(0);
      });
    });

    it('filters contained tombstones', () => {
      createController();

      return Promise.resolve().then(() => {
        const change = { doc: { type: 'this is not a form' } };
        LiveList.reports.containsDeleteStub.returns(true);
        chai.expect(!!changesFilter(change)).to.equal(true);
        chai.expect(LiveList.reports.containsDeleteStub.callCount).to.equal(1);
        chai.expect(LiveList.reports.containsDeleteStub.args[0]).to.deep.equal([ change.doc ]);
      });
    });

    it('filters everything else', () => {
      createController();
      LiveList.reports.containsDeleteStub.returns(false);

      return Promise.resolve().then(() => {
        chai.expect(!!changesFilter({ doc: { some: 'thing' } })).to.equal(false);
      });
    });

    it('removes deleted reports from the list', () => {
      createController();

      return Promise.resolve().then(() => {
        changesCallback({ deleted: true, doc: { _id: 'id' } });
        chai.expect(LiveList.reports.remove.callCount).to.equal(1);
        chai.expect(LiveList.reports.remove.args[0]).to.deep.equal([ { _id: 'id' } ]);
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
});
