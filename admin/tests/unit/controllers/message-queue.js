describe('MessageQueueCtrl controller', () => {

  'use strict';

  let scope,
      stateGo,
      MessageQueue,
      Settings,
      $rootScope,
      createController;

  beforeEach(module('adminApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    stateGo = sinon.stub();
    MessageQueue = {
      query: sinon.stub(),
      loadTranslations: sinon.stub()
    };
    Settings = sinon.stub();

    createController = function(tab, descending, page) {
      return $controller('MessageQueueCtrl', {
        '$log': { error: sinon.stub() },
        '$q': Q,
        '$scope': scope,
        '$state': {
          current: { data: { tab: tab, descending: descending } },
          params: { page: page },
          go: stateGo
        },
        'Location': { path: 'some path' },
        'MessageQueue': MessageQueue,
        'Settings': Settings
      });
    };
  }));

  afterEach(() => sinon.restore());

  describe('init', () => {
    it('queries settings and loads translations before querying, loads first page', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({ reported_date_format: 'my date format' });

      createController('tab');
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(MessageQueue.loadTranslations.callCount).to.equal(1);
      chai.expect(MessageQueue.query.callCount).to.equal(0);
      chai.expect(scope.loading).to.equal(true);

      setTimeout(() => {
        chai.expect(scope.dateFormat).to.equal('my date format');
        chai.expect(MessageQueue.query.callCount).to.equal(1);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['tab', 0, 25, undefined]);
        chai.expect(scope.basePath).to.equal('some path');
        done();
      }, 20);
    });

    it('catches Settings errors', done => {
      MessageQueue.loadTranslations.resolves();
      Settings.rejects({ error: true });

      createController('tab');
      setTimeout(() => {
        chai.expect(MessageQueue.query.callCount).to.equal(0);
        done();
      }, 20);
    });

    it('catches loadTranslation errors', done => {
      MessageQueue.loadTranslations.rejects();
      Settings.resolves({});

      createController('tab');
      setTimeout(() => {
        chai.expect(MessageQueue.query.callCount).to.equal(0);
        done();
      }, 20);
    });
  });

  describe('$state', () => {
    it('loads selected tab', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [], total: 0 });
      Settings.resolves({ reported_date_format: 'a' });

      createController('random string');
      setTimeout(() => {
        chai.expect(MessageQueue.query.args[0][0]).to.equal('random string');
        chai.expect(MessageQueue.query.args[0][3]).to.equal(undefined);
        chai.expect(scope.pagination.page).to.equal(1);
        done();
      }, 20);
    });

    it('queries MessageQueue with descending param if set', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [], total: 0 });
      Settings.resolves({});

      createController('my tab', 'descending');
      setTimeout(() => {
        chai.expect(MessageQueue.query.args[0][0]).to.equal('my tab');
        chai.expect(MessageQueue.query.args[0][3]).to.equal('descending');
        chai.expect(scope.pagination.page).to.equal(1);
        done();
      }, 20);
    });

    it('loads selected page', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      createController('some tab', false, 10);
      setTimeout(() => {
        chai.expect(scope.pagination.page).to.equal(10);
        chai.expect(MessageQueue.query.args[0][1]).to.equal(225);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 10 }, { notify: false }]);
        done();
      }, 20);
    });

    it('normalizes page param (objects)', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      createController('c', false, { a: 1 });
      setTimeout(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['c', 0, 25, false]);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 1 }, { notify: false }]);
        done();
      }, 20);
    });

    it('normalizes page param (arrays)', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      createController('d', false, [ 1, 2, 3]);
      setTimeout(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['d', 0, 25, false]);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 1 }, { notify: false }]);
        done();
      }, 20);
    });

    it('normalizes page param (strings)', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      createController('e', false, 'whatever');
      setTimeout(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['e', 0, 25, false]);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 1 }, { notify: false }]);
        done();
      }, 20);
    });

    it('normalizes page param (strings)', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      createController('f', false, '22');
      setTimeout(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['f', 525, 25, false]);
        chai.expect(scope.pagination.page).to.equal(22);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 22 }, { notify: false }]);
        done();
      }, 20);
    });

    it('normalizes page param (negative numbers)', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      createController('g', false, -200);
      setTimeout(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['g', 0, 25, false]);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 1 }, { notify: false }]);
        done();
      }, 20);
    });

    it('normalizes page param (floating point numbers)', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      createController('h', false, 4.23);
      setTimeout(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['h', 75, 25, false]);
        chai.expect(scope.pagination.page).to.equal(4);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 4 }, { notify: false }]);
        done();
      }, 20);
    });
  });

  describe('display', () => {
    it('assigns scope messages, updates pagination', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [{ id: 1}, { id: 2 }, { id: 3 }, { id: 4 }], total: 210 });
      Settings.resolves({});

      createController('tab', false, 5);
      setTimeout(() => {
        chai.expect(scope.pagination).to.deep.equal({
          page: 5,
          total: 210,
          perPage: 25,
          pages: 9
        });

        chai.expect(scope.messages).to.deep.equal([{ id: 1}, { id: 2 }, { id: 3 }, { id: 4 }]);
        chai.expect(scope.error).to.equal(false);
        chai.expect(scope.loading).to.equal(false);
        chai.expect(scope.displayLastUpdated).to.equal(true);
        done();
      }, 20);
    });

    it('catches query errors', done => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.rejects({ some: 'error' });
      Settings.resolves({});

      createController('tab');
      setTimeout(() => {
        chai.expect(scope.error).to.equal(true);
        chai.expect(scope.loading).to.equal(false);
        chai.expect(scope.displayLastUpdated).to.equal(true);
        done();
      }, 20);
    });

    it('applies conditional styling params', done => {
      const now = new Date().getTime();
      MessageQueue.loadTranslations.resolves();
      Settings.resolves({});
      MessageQueue.query.resolves({
        total: 10,
        messages: [
          { state: 'pending', stateHistory: { timestamp: 0 } },
          { state: 'received', stateHistory: { timestamp: now } },
          { state: 'sent' },
          { state: 'forwarded-by-gateway', stateHistory: {} },
          { state: 'random', stateHistory: { timestamp: 0 } }
        ]
      }, 20);

      createController('due');
      setTimeout(() => {
        chai.expect(scope.displayLastUpdated).to.equal(true);
        chai.expect(scope.messages).to.deep.equal([
          { state: 'pending', stateHistory: { timestamp: 0 }, delayed: true },
          { state: 'received', stateHistory: { timestamp: now }, delayed: false },
          { state: 'sent' },
          { state: 'forwarded-by-gateway', stateHistory: {}, delayed: false },
          { state: 'random', stateHistory: { timestamp: 0 } }
        ]);
        done();
      }, 20);
    });

    it('does not display last updated date for scheduled tab', done =>{
      MessageQueue.loadTranslations.resolves();
      Settings.resolves({});
      MessageQueue.query.resolves({
        total: 10,
        messages: [ { state: 'scheduled', stateHistory: { timestamp: 0 } }]
      });

      createController('scheduled');
      setTimeout(() => {
        chai.expect(scope.displayLastUpdated).to.equal(false);
        done();
      }, 20);
    });
  });

  describe('pagination', () => {
    it('normalizes the page', done => {
      MessageQueue.loadTranslations.resolves();
      Settings.resolves();
      MessageQueue.query.withArgs('sometab', 0).resolves({ messages: [{ id: 1 }], total: 5 });

      createController('sometab');
      setTimeout(() => {
        chai.expect(scope.pagination.page).to.equal(1);
        scope.loadPage('something');
        chai.expect(MessageQueue.query.callCount).to.equal(2);
        chai.expect(MessageQueue.query.args[1][1]).to.equal(0);
        chai.expect(scope.pagination.page).to.equal(1);
        setTimeout(() => {
          scope.loadPage({ some: 'thing' });
          chai.expect(MessageQueue.query.callCount).to.equal(3);
          chai.expect(MessageQueue.query.args[2][1]).to.equal(0);
          chai.expect(scope.pagination.page).to.equal(1);
          setTimeout(() => {
            scope.loadPage(false);
            chai.expect(MessageQueue.query.callCount).to.equal(4);
            chai.expect(MessageQueue.query.args[3][1]).to.equal(0);
            chai.expect(scope.pagination.page).to.equal(1);
            setTimeout(() => {
              scope.loadPage(-200);
              chai.expect(MessageQueue.query.callCount).to.equal(5);
              chai.expect(MessageQueue.query.args[4][1]).to.equal(0);
              chai.expect(scope.pagination.page).to.equal(1);
              done();
            }, 20);
          }, 20);
        }, 20);
      }, 20);
    });

    it('paginates correctly', done => {
      MessageQueue.loadTranslations.resolves();
      Settings.resolves();

      MessageQueue.query
        .withArgs('sometab', 0).resolves({ messages: [{ id: 1 }], total: 503 })
        .withArgs('sometab', 25).resolves({ messages: [{ id: 2 }], total: 497 })
        .withArgs('sometab', 75).resolves({ messages: [{ id: 3 }], total: 512 })
        .withArgs('sometab', 125).resolves({ messages: [{ id: 4 }], total: 482 })
        .withArgs('sometab', 275).resolves({ messages: [], total: 200 });

      createController('sometab', false, 2);
      setTimeout(() => {
        chai.expect(scope.pagination.page).to.equal(2);
        chai.expect(MessageQueue.query.args[0][1]).to.equal(25);
        chai.expect(scope.messages).to.deep.equal([{ id: 2 }]);
        chai.expect(scope.pagination.total).to.equal(497);

        scope.loadPage(4);
        setTimeout(() => {
          chai.expect(scope.pagination.page).to.equal(4);
          chai.expect(MessageQueue.query.args[1][1]).to.equal(75);
          chai.expect(scope.messages).to.deep.equal([{ id: 3 }]);
          chai.expect(scope.pagination.total).to.equal(512);

          scope.loadPage(6);
          setTimeout(() => {
            chai.expect(scope.pagination.page).to.equal(6);
            chai.expect(MessageQueue.query.args[2][1]).to.equal(125);
            chai.expect(scope.messages).to.deep.equal([{ id: 4 }]);
            chai.expect(scope.pagination.total).to.equal(482);

            scope.loadPage(21);
            setTimeout(() => {
              chai.expect(MessageQueue.query.callCount).to.equal(3);
              scope.loadPage(12);

              setTimeout(() => {
                chai.expect(scope.pagination.page).to.equal(1);
                chai.expect(MessageQueue.query.callCount).to.equal(5);
                chai.expect(MessageQueue.query.args[3][1]).to.equal(275);
                chai.expect(MessageQueue.query.args[4][1]).to.equal(0);
                done();
              }, 20);
            }, 20);
          }, 20);
        }, 20);
      }, 20);
    });
  });

});
