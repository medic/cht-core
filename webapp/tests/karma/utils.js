// Override chai.assert.equal to pretty print.
const equal = chai.assert.equal;
chai.assert.equal = function() {
  try {
    equal.apply(this, arguments);
  } catch(e) {
    throw new Error(e +
        '\nA: ' + JSON.stringify(arguments[0], null, 2) +
        '\nB: ' + JSON.stringify(arguments[1], null, 2));
  }
};

chai.assert.checkDeepProperties = chai.assert.shallowDeepEqual;

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
    angular.module('inboxApp').config(function($ngReduxProvider, RootReducer) {
      'ngInject';
      $ngReduxProvider.createStoreWith(
        RootReducer,
        [ReduxThunk.default], [], initialState // eslint-disable-line no-undef
      );
    });

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

const sortedJson = function(o) {
  let s;
  if(typeof o !== 'object') {
    return JSON.stringify(o);
  }
  if(_.isArray(o)) {
    s = '[ ';
    o.forEach(function(e) {
      s += sortedJson(e) + ', ';
    });
    return s + ']';
  }
  const keys = Object.keys(o).sort();
  s = '{ ';
  for(let i=0; i<keys.length; ++i) {
    const k = keys[i];
    s += '"' + k + '":' + sortedJson(o[k]) + ', ';
  }
  // N.B. not valid JSON, as an extra comma will appear
  return s + '}';
};

const _originalDeepEqual = chai.assert.deepEqual;
chai.assert.deepEqual = function() {
  try {
    _originalDeepEqual.apply(this, arguments);
  } catch(e) {
    throw new Error(e +
        '\n\nactual:\n' + sortedJson(arguments[0]) +
        '\n\nexpected:\n' + sortedJson(arguments[1]) +
        '\n'
    );
  }
};
