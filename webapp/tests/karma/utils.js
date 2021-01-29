chai.assert.checkDeepProperties = chai.assert.shallowDeepEqual;
chai.config.truncateThreshold = 0;

window.KarmaUtils = {
  restore: function() {
    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i];
      if (typeof arg !== 'undefined' && arg) {
        if (arg.restore) {
          arg.restore();
        } else if (arg.reset) {
          arg.reset();
        }
      }
    }
  },
  // A service that returns a promise,
  // to mock out e.g. UserSettings().then(function(promiseResult) { ... })
  promiseService: function(err, promiseResult) {
    return () => KarmaUtils.promise(err, promiseResult);
  },
  promise: (err, payload) => err ? Promise.reject(err) : Promise.resolve(payload),
  // a promise than never resolves or rejects
  nullPromise: () => () => Q.defer().promise,
  mockDB: db => () => () => db,
  setupMockStore: function(initialState, mocks = {}) {
    /* ToDo: migrate and/or clean
    angular.module('inboxApp').config(function($ngReduxProvider, RootReducer) {
      'ngInject';
      $ngReduxProvider.createStoreWith(
        RootReducer,
        [ReduxThunk.default], [], initialState // eslint-disable-line no-undef
      );
    });
    */
    const DB = () => ({
      get: () => Promise.resolve(),
      post: () => Promise.resolve(),
      info: () => Promise.resolve()
    });
    const mockDB = mocks.DB || DB;
    const liveListStub = { clearSelected: () => {} };
    const mockLiveList = _.merge({
      contacts: liveListStub,
      'contact-search': liveListStub,
      reports: liveListStub,
      'report-search': liveListStub
    }, mocks.LiveList);

    module(function ($provide) {
      'ngInject';
      // If actual DB is run it causes a full page refresh which causes karma to error
      $provide.value('DB', mockDB);
      $provide.value('ContactViewModelGenerator', () => {});
      $provide.value('ReportViewModelGenerator', () => {});
      $provide.value('LiveList', mockLiveList);
      $provide.value('Session', {
        userCtx: () => { return {}; }
      });
    });
  }
};
