describe('UpdateUser service', function() {

  'use strict';

  let service;
  let $http;

  beforeEach(function() {
    $http = sinon.stub().resolves();
    module('adminApp');
    module($provide => {
      $provide.value('$http', $http);
    });
    inject(function($injector) {
      service = $injector.get('UpdateUser');
    });
  });

  afterEach(function() {
    KarmaUtils.restore($http);
  });

  it('POSTs changes to the api', () => {
    return service('user', {some: 'updates'}).then(() => {
      chai.expect($http.callCount).to.equal(1);
      chai.expect($http.args[0][0]).to.deep.equal({
        url: '/api/v1/users/user',
        method: 'POST',
        data: {some: 'updates'},
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    });
  });

  it('Uses Basic Auth if provided', () => {
    return service('user', {some: 'updates'}, 'user', 'pass').then(() => {
      chai.expect($http.callCount).to.equal(1);
      chai.expect($http.args[0][0]).to.deep.equal({
        url: '/api/v1/users/user',
        method: 'POST',
        data: {some: 'updates'},
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ' + btoa('user:pass')
        }
      });
    });
  });
});

describe('CreateUser service', () => {

  'use strict';

  let service;
  let $http;

  beforeEach(function() {
    $http = sinon.stub().resolves();
    module('adminApp');
    module($provide => {
      $provide.value('$http', $http);
      $provide.value('$Q', Q);
    });
    inject(function($injector) {
      service = $injector.get('CreateUser');
    });
  });

  afterEach(function() {
    KarmaUtils.restore($http);
  });

  it('POSTs new users via changes to the api', () => {
    return service
      .createSingleUser({username: 'user', some: 'updates'})
      .then(() => {
        chai.expect($http.callCount).to.equal(1);
        chai.expect($http.args[0][0]).to.deep.equal({
          method: 'POST',
          url: '/api/v2/users',
          data: {username: 'user', some: 'updates'},
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      });
  });
});

describe('DeleteUser service', () => {

  'use strict';

  let service;
  let $http;

  beforeEach(() => {
    $http = sinon.stub().resolves();
    module('adminApp');
    module($provide => {
      $provide.value('$http', $http);
      $provide.value('$Q', Q);
    });
    inject(function($injector) {
      service = $injector.get('DeleteUser');
    });
  });

  afterEach(() => {
    KarmaUtils.restore($http);
  });

  it('DELETEs the given user via the api', () => {
    return service('user').then(() => {
      chai.expect($http.callCount).to.equal(1);
      chai.expect($http.args[0][0]).to.deep.equal({
        method: 'DELETE',
        url: '/api/v1/users/user',
        headers: {
          'Accept': 'application/json'
        }
      });
    });
  });
});
