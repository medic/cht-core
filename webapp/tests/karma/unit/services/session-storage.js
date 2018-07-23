describe('Session storage service', function() {

  'use strict';

  var store,
      service;

  beforeEach(function() {
    store = { getNamespacedStore: sinon.stub() };
    module('inboxApp');
    module(function ($provide) {
      $provide.value('store', store);
    });

    inject($injector => {
      service = $injector.get('SessionStorage');
    });
  });

  it('creates a namespaced store', () => {
    chai.expect(store.getNamespacedStore.callCount).to.equal(1);
    chai.expect(store.getNamespacedStore.args[0]).to.deep.equal(['medic.session', 'sessionStorage']);
  });

});
