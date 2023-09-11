describe('MessageQueueCtrl controller', () => {

  'use strict';

  let scope;
  let stateGo;
  let MessageQueue;
  let Settings;
  let $rootScope;
  let createController;

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
    it('queries settings and loads translations before querying, loads first page', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({ reported_date_format: 'my date format' });

      const controller = createController('tab');
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(MessageQueue.loadTranslations.callCount).to.equal(1);
      chai.expect(MessageQueue.query.callCount).to.equal(0);
      chai.expect(scope.loading).to.equal(true);

      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(scope.dateFormat).to.equal('my date format');
        chai.expect(MessageQueue.query.callCount).to.equal(1);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['tab', 0, 25, undefined]);
        chai.expect(scope.basePath).to.equal('some path');
      });
    });

    it('catches Settings errors', () => {
      MessageQueue.loadTranslations.resolves();
      Settings.rejects({ error: true });

      const controller = createController('tab');
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.callCount).to.equal(0);
      });
    });

    it('catches loadTranslation errors', () => {
      MessageQueue.loadTranslations.rejects();
      Settings.resolves({});

      const controller = createController('tab');
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.callCount).to.equal(0);
      });
    });
  });

  describe('$state', () => {
    it('loads selected tab', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [], total: 0 });
      Settings.resolves({ reported_date_format: 'a' });

      const controller = createController('random string');
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.args[0][0]).to.equal('random string');
        chai.expect(MessageQueue.query.args[0][3]).to.equal(undefined);
        chai.expect(scope.pagination.page).to.equal(1);
      });
    });

    it('queries MessageQueue with descending param if set', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [], total: 0 });
      Settings.resolves({});

      const controller = createController('my tab', 'descending');
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.args[0][0]).to.equal('my tab');
        chai.expect(MessageQueue.query.args[0][3]).to.equal('descending');
        chai.expect(scope.pagination.page).to.equal(1);
      });
    });

    it('loads selected page', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      const controller = createController('some tab', false, 10);
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(scope.pagination.page).to.equal(10);
        chai.expect(MessageQueue.query.args[0][1]).to.equal(225);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 10 }, { notify: false }]);
      });
    });

    it('normalizes page param (objects)', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      const controller = createController('c', false, { a: 1 });
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['c', 0, 25, false]);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 1 }, { notify: false }]);
      });
    });

    it('normalizes page param (arrays)', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      const controller = createController('d', false, [ 1, 2, 3]);
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['d', 0, 25, false]);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 1 }, { notify: false }]);
      });
    });

    it('normalizes page param (strings)', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      const controller = createController('e', false, 'whatever');
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['e', 0, 25, false]);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 1 }, { notify: false }]);
      });
    });

    it('normalizes page param (strings)', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      const controller = createController('f', false, '22');
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['f', 525, 25, false]);
        chai.expect(scope.pagination.page).to.equal(22);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 22 }, { notify: false }]);
      });
    });

    it('normalizes page param (negative numbers)', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      const controller = createController('g', false, -200);
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['g', 0, 25, false]);
        chai.expect(scope.pagination.page).to.equal(1);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 1 }, { notify: false }]);
      });
    });

    it('normalizes page param (floating point numbers)', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [1], total: 1 });
      Settings.resolves({});

      const controller = createController('h', false, 4.23);
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(MessageQueue.query.args[0]).to.deep.equal(['h', 75, 25, false]);
        chai.expect(scope.pagination.page).to.equal(4);
        chai.expect(stateGo.callCount).to.equal(1);
        chai.expect(stateGo.args[0]).to.deep.equal(['.', { page: 4 }, { notify: false }]);
      });
    });
  });

  describe('display', () => {
    it('assigns scope messages, updates pagination', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.resolves({ messages: [{ id: 1}, { id: 2 }, { id: 3 }, { id: 4 }], total: 210 });
      Settings.resolves({});

      const controller = createController('tab', false, 5);
      return controller.getSetupPromiseForTesting().then(() => {
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

      });
    });

    it('catches query errors', () => {
      MessageQueue.loadTranslations.resolves();
      MessageQueue.query.rejects({ some: 'error' });
      Settings.resolves({});

      const controller = createController('tab');
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(scope.error).to.equal(true);
        chai.expect(scope.loading).to.equal(false);
        chai.expect(scope.displayLastUpdated).to.equal(true);
      });
    });

    it('applies conditional styling params', () => {
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
      });

      const controller = createController('due');
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(scope.displayLastUpdated).to.equal(true);
        chai.expect(scope.messages).to.deep.equal([
          { state: 'pending', stateHistory: { timestamp: 0 }, delayed: true },
          { state: 'received', stateHistory: { timestamp: now }, delayed: false },
          { state: 'sent' },
          { state: 'forwarded-by-gateway', stateHistory: {}, delayed: false },
          { state: 'random', stateHistory: { timestamp: 0 } }
        ]);
      });
    });

    it('does not display last updated date for scheduled tab', () => {
      MessageQueue.loadTranslations.resolves();
      Settings.resolves({});
      MessageQueue.query.resolves({
        total: 10,
        messages: [ { state: 'scheduled', stateHistory: { timestamp: 0 } }]
      });

      const controller = createController('scheduled');
      return controller.getSetupPromiseForTesting().then(() => {
        chai.expect(scope.displayLastUpdated).to.equal(false);
      });
    });
  });

  describe('pagination', () => {
    it('normalizes the page', () => {
      MessageQueue.loadTranslations.resolves();
      Settings.resolves();
      MessageQueue.query.withArgs('sometab', 0).resolves({ messages: [{ id: 1 }], total: 5 });

      const controller = createController('sometab');
      return controller.getSetupPromiseForTesting()
        .then(() => {
          chai.expect(scope.pagination.page).to.equal(1);
          const promise = scope.loadPage('something');
          chai.expect(MessageQueue.query.callCount).to.equal(2);
          chai.expect(MessageQueue.query.args[1][1]).to.equal(0);
          chai.expect(scope.pagination.page).to.equal(1);
          return promise;
        })
        .then(() => {
          const promise = scope.loadPage({ some: 'thing' });
          chai.expect(MessageQueue.query.callCount).to.equal(3);
          chai.expect(MessageQueue.query.args[2][1]).to.equal(0);
          chai.expect(scope.pagination.page).to.equal(1);
          return promise;
        })
        .then(() => {
          const promise = scope.loadPage(false);
          chai.expect(MessageQueue.query.callCount).to.equal(4);
          chai.expect(MessageQueue.query.args[3][1]).to.equal(0);
          chai.expect(scope.pagination.page).to.equal(1);
          return promise;
        })
        .then(() => {
          scope.loadPage(-200);
          chai.expect(MessageQueue.query.callCount).to.equal(5);
          chai.expect(MessageQueue.query.args[4][1]).to.equal(0);
          chai.expect(scope.pagination.page).to.equal(1);
        });
    });

    it('paginates correctly', () => {
      MessageQueue.loadTranslations.resolves();
      Settings.resolves();

      MessageQueue.query
        .withArgs('sometab', 0).resolves({ messages: [{ id: 1 }], total: 503 })
        .withArgs('sometab', 25).resolves({ messages: [{ id: 2 }], total: 497 })
        .withArgs('sometab', 75).resolves({ messages: [{ id: 3 }], total: 512 })
        .withArgs('sometab', 125).resolves({ messages: [{ id: 4 }], total: 482 })
        .withArgs('sometab', 275).resolves({ messages: [], total: 200 });

      const controller = createController('sometab', false, 2);
      return controller.getSetupPromiseForTesting()
        .then(() => {
          chai.expect(scope.pagination.page).to.equal(2);
          chai.expect(MessageQueue.query.args[0][1]).to.equal(25);
          chai.expect(scope.messages).to.deep.equal([{ id: 2 }]);
          chai.expect(scope.pagination.total).to.equal(497);

          return scope.loadPage(4);
        })
        .then(() => {
          chai.expect(scope.pagination.page).to.equal(4);
          chai.expect(MessageQueue.query.args[1][1]).to.equal(75);
          chai.expect(scope.messages).to.deep.equal([{ id: 3 }]);
          chai.expect(scope.pagination.total).to.equal(512);

          return scope.loadPage(6);
        })
        .then(() => {
          chai.expect(scope.pagination.page).to.equal(6);
          chai.expect(MessageQueue.query.args[2][1]).to.equal(125);
          chai.expect(scope.messages).to.deep.equal([{ id: 4 }]);
          chai.expect(scope.pagination.total).to.equal(482);

          return scope.loadPage(21);
        })
        .then(() => {
          chai.expect(MessageQueue.query.callCount).to.equal(3);

          return scope.loadPage(12);
        })
        .then(() => {
          chai.expect(scope.pagination.page).to.equal(1);
          chai.expect(MessageQueue.query.callCount).to.equal(5);
          chai.expect(MessageQueue.query.args[3][1]).to.equal(275);
          chai.expect(MessageQueue.query.args[4][1]).to.equal(0);
        });
    });
  });

});
