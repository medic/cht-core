describe('TrafficStats service', function() {

  'use strict';

  var postStub,
    putStub,
    $q,
    queryStub,
    $rootScope,
    service,
    stats,
    $window;

  beforeEach(function() {
    stats = {rx: 123, tx: 456};
    $window = {};
    $window.medicmobile_android = {};
    $window.medicmobile_android.getDataUsage = function() { return JSON.stringify(stats); };
    postStub = sinon.stub();
    putStub = sinon.stub();
    queryStub = sinon.stub();
    module('inboxApp');
    module(function($provide) {
      $provide.factory(
        'DB',
        KarmaUtils.mockDB({
          query: queryStub,
          post: postStub,
          put: putStub
        })
      );
      $provide.value('Session', {userCtx: function() { return {name: 'bob'}; }});
      $provide.factory('Debug', function() {
        return {get: sinon.stub()};
      });
      $provide.value('$window', $window);
    });
    inject(function(_TrafficStats_, _$q_, _$rootScope_) {
      service = _TrafficStats_;
      $q = _$q_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(postStub, putStub, queryStub);
  });

  it('doesn\'t log traffic_stats doc when not available', function() {
    $window.medicmobile_android = {};
    service();
    chai.assert.isFalse(queryStub.called);
  });

  it('creates a traffic_stats doc when there isn\'t one', function(done) {
    queryStub.returns(KarmaUtils.mockPromise(null, {
      rows: []
    }));
    service();
    setTimeout(function() {
      $rootScope.$apply(); // needed to resolve the promises
      chai.assert.isTrue(postStub.called);
      var doc = postStub.getCall(0).args[0];
      chai.expect(doc.type).to.equal('traffic_stats');
      chai.expect(doc.traffic.length).to.equal(1);
      chai.expect(doc.traffic[0].rx).to.equal(stats.rx);
      chai.expect(doc.traffic[0].tx).to.equal(stats.tx);
      chai.expect(doc.traffic[0]).to.have.property('timestamp');
      done();
    });
  });

  it('appends to traffic_stats doc when there is one', function(done) {
    queryStub.returns(KarmaUtils.mockPromise(null, {
      rows: [{ doc: {traffic: []} }]
    }));
    service();
    setTimeout(function() {
      $rootScope.$apply(); // needed to resolve the promises
      var doc = putStub.getCall(0).args[0];
      chai.expect(doc.traffic.length).to.equal(1);
      chai.expect(doc.traffic[0].rx).to.equal(stats.rx);
      chai.expect(doc.traffic[0].tx).to.equal(stats.tx);
      chai.expect(doc.traffic[0]).to.have.property('timestamp');
      chai.expect(queryStub.args[0][0]).to.equal('medic-client/doc_by_type');
      chai.expect(queryStub.args[0][1]).to.deep.equal({ key: [ 'traffic_stats' ], include_docs: true });
      done();
    });
  });

});