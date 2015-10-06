describe('MessageState service', function() {

  'use strict';

  var service,
      get,
      put;

  beforeEach(function() {
    put = sinon.stub();
    get = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ put: put, get: get }));
    });
    inject(function(_MessageState_) {
      service = _MessageState_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(put, get);
  });

  it('any returns true when some row in the group matches', function() {
    var group = {
      rows: [
        { state: 'sent' },
        { state: 'scheduled' },
        { state: 'muted' }
      ]
    };
    chai.expect(service.any(group, 'muted')).to.equal(true);
  });

  it('any returns false when no row in the group matches', function() {
    var group = {
      rows: [
        { state: 'sent' },
        { state: 'pending' },
        { state: 'muted' }
      ]
    };
    chai.expect(service.any(group, 'scheduled')).to.equal(false);
  });

  it('any returns false when no rows', function() {
    var group = {
      rows: []
    };
    chai.expect(service.any(group, 'scheduled')).to.equal(false);
  });

  it('set returns get errors', function(done) {
    get.returns(KarmaUtils.mockPromise('db messed up'));
    service.set('123', 2, 'scheduled', 'muted').catch(function(err) {
      chai.expect(err).to.equal('db messed up');
      done();
    });
  });

  it('set does not save if nothing changed', function(done) {
    var doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    get.returns(KarmaUtils.mockPromise(null, doc));
    service.set('123', 2, 'scheduled', 'muted').then(function() {
      done();
    });
  });

  it('set returns save errors', function(done) {
    var doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    get.returns(KarmaUtils.mockPromise(null, doc));
    put.returns(KarmaUtils.mockPromise('save borked'));
    service.set('123', 2, 'muted', 'scheduled').catch(function(err) {
      chai.expect(err).to.equal('save borked');
      done();
    });
  });

  it('set saves if task changed', function(done) {
    var doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'sent' },
        { group: 2, state: 'muted', state_history: [{ state: 'muted', timestamp: '2014-09-11T02:52:45.586Z' }] },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    get.returns(KarmaUtils.mockPromise(null, doc));
    put.returns(KarmaUtils.mockPromise());
    service.set('123', 2, 'muted', 'scheduled').then(function() {
      chai.expect(get.args[0][0]).to.equal('123');
      var actual = put.args[0][0];
      chai.expect(actual.scheduled_tasks.length).to.equal(5);
      chai.expect(actual.scheduled_tasks[0].state).to.equal('scheduled');
      chai.expect(actual.scheduled_tasks[0].state_history).to.equal(undefined);
      chai.expect(actual.scheduled_tasks[1].state).to.equal('sent');
      chai.expect(actual.scheduled_tasks[1].state_history).to.equal(undefined);
      chai.expect(actual.scheduled_tasks[2].state).to.equal('scheduled');
      chai.expect(actual.scheduled_tasks[2].state_history.length).to.equal(2);
      chai.expect(actual.scheduled_tasks[2].state_history[0].state).to.equal('muted');
      chai.expect(actual.scheduled_tasks[2].state_history[1].state).to.equal('scheduled');
      chai.expect(actual.scheduled_tasks[3].state).to.equal('scheduled');
      chai.expect(actual.scheduled_tasks[3].state_history.length).to.equal(1);
      chai.expect(actual.scheduled_tasks[3].state_history[0].state).to.equal('scheduled');
      chai.expect(actual.scheduled_tasks[4].state).to.equal('sent');
      chai.expect(actual.scheduled_tasks[4].state_history).to.equal(undefined);
      done();
    });
  });

});