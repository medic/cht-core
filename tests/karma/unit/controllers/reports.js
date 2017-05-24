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
      changesCallback;

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
      setSelected: sinon.stub()
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

    Search = (type, filters, options, callback) => {
      callback(null, { });
    };

    Changes = options => {
      changesCallback = options.callback;
      return { unsubscribe: () => {} };
    };

    changesCallback = undefined;

    createController = () => {
      return $controller('ReportsCtrl', {
        '$scope': scope,
        'UserDistrict': UserDistrict,
        'Changes': Changes,
        'MarkRead': MarkRead,
        'Search': Search,
        'Verified': {},
        'DeleteDocs': {},
        'UpdateFacility': {},
        'MessageState': {},
        'EditGroup': {},
        'FormatDataRecord': FormatDataRecord,
        'Settings': KarmaUtils.nullPromise(),
        'DB': KarmaUtils.mockDB({ get: get, post: post })(),
        'LiveList': LiveList,
        'ReportViewModelGenerator': {},
        'Tour': () => {},
        'SearchFilters': () => {},
        'Export': () => {}
      });
    };
  }));

  it('set up controller', () => {
    createController();
  });

  it('verifies the given report', done => {
    get.returns(KarmaUtils.mockPromise(null, { _id: 'def', name: 'hello' }));
    post.returns(KarmaUtils.mockPromise());
    createController();
    scope.selected[0] = {
      _id: 'abc',
      doc: { form: 'P' }
    };
    scope.$broadcast('VerifyReport', true);
    setTimeout(() => {
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('abc');
      chai.expect(post.callCount).to.equal(1);
      chai.expect(post.args[0][0]._id).to.equal('def');
      chai.expect(post.args[0][0].name).to.equal('hello');
      chai.expect(post.args[0][0].verified).to.equal(true);
      done();
    });
  });

  it('when selecting a report, it sets the phone number in the actionbar', done => {
    const phone = 12345;
    get.returns(KarmaUtils.mockPromise(null, { _id: 'def', name: 'hello', phone: phone }));
    post.returns(KarmaUtils.mockPromise());
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

});
