describe('UpdateUser service', function() {

  'use strict';

  var scope,
      service,
      $http;

  beforeEach(function() {
    $http = sinon.stub();
    $http.returns(Promise.resolve());
    module('inboxApp');
    module($provide => {
      $provide.value('$http', $http);
    });
    inject(function($injector) {
      scope = $injector.get('$rootScope');
      service = $injector.get('UpdateUser');
    });
  });

  afterEach(function() {
    KarmaUtils.restore($http);
  });

  it('POSTs changes to the api', () =>
    service('user', {some: 'updates'})
      .then(() => {
        chai.expect($http.callCount).to.equal(1);
        chai.expect($http.args[0][0]).to.deep.equal({
          method: 'POST',
          url: '/api/v1/users/user',
          data: {some: 'updates'},
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }));

  it('Uses Basic Auth if provided', () =>
    service('user', {some: 'updates'}, 'user', 'pass')
      .then(() => {
        chai.expect($http.callCount).to.equal(1);
        chai.expect($http.args[0][0]).to.deep.equal({
          method: 'POST',
          url: 'http://user:pass@server:80/api/v1/users/user',
          data: {some: 'updates'},
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }));
});

describe('CreateUser service', function() {

  'use strict';

  var scope,
      service,
      $http;

  beforeEach(function() {
    $http = sinon.stub();
    $http.returns(Promise.resolve());
    module('inboxApp');
    module($provide => {
      $provide.value('$http', $http);
      $provide.value('$Q', Q);
    });
    inject(function($injector) {
      scope = $injector.get('$rootScope');
      service = $injector.get('CreateUser');
    });
  });

  afterEach(function() {
    KarmaUtils.restore($http);
  });

  it('POSTs new users via changes to the api', () =>
    service({username: 'user', some: 'updates'})
      .then(() => {
        chai.expect($http.callCount).to.equal(1);
        chai.expect($http.args[0][0]).to.deep.equal({
          method: 'POST',
          url: '/api/v1/users',
          data: {username: 'user', some: 'updates'},
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }));
});

describe('DeleteUser service', function() {

  'use strict';

  var scope,
      service,
      $http;

  beforeEach(function() {
    $http = sinon.stub();
    $http.returns(Promise.resolve());
    module('inboxApp');
    module($provide => {
      $provide.value('$http', $http);
      $provide.value('$Q', Q);
    });
    inject(function($injector) {
      scope = $injector.get('$rootScope');
      service = $injector.get('DeleteUser');
    });
  });

  afterEach(function() {
    KarmaUtils.restore($http);
  });

  it('DELETEs the given user via the api', () =>
    service('user')
      .then(() => {
        chai.expect($http.callCount).to.equal(1);
        chai.expect($http.args[0][0]).to.deep.equal({
          method: 'DELETE',
          url: '/api/v1/users/user'
        });
      }));
});
