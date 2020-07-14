describe('MessageState service', function() {

  'use strict';

  let service;
  let get;
  let put;
  let SetTaskState;

  beforeEach(function() {
    put = sinon.stub();
    get = sinon.stub();
    SetTaskState = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ put: put, get: get }));
      $provide.factory('SetTaskState', function() { return SetTaskState; });
    });
    inject(function(_MessageState_) {
      service = _MessageState_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(put, get);
  });

  it('any returns true when some row in the group matches', function() {
    const group = {
      rows: [
        { state: 'sent' },
        { state: 'scheduled' },
        { state: 'muted' }
      ]
    };
    chai.expect(service.any(group, 'muted')).to.equal(true);
  });

  it('any returns false when no row in the group matches', function() {
    const group = {
      rows: [
        { state: 'sent' },
        { state: 'pending' },
        { state: 'muted' }
      ]
    };
    chai.expect(service.any(group, 'scheduled')).to.equal(false);
  });

  it('any returns false when no rows', function() {
    const group = {
      rows: []
    };
    chai.expect(service.any(group, 'scheduled')).to.equal(false);
  });

  it('set returns get errors', function(done) {
    get.returns(Promise.reject('db messed up'));
    service.set('123', 2, 'scheduled', 'muted').catch(function(err) {
      chai.expect(err).to.equal('db messed up');
      done();
    });
  });

  it('set does not save if nothing changed', function(done) {
    const doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    get.returns(Promise.resolve(doc));
    service.set('123', 2, 'scheduled', 'muted').then(function() {
      done();
    }).catch((err) => {
      window.__karma__.error(err);
    });
  });

  it('set returns save errors', function(done) {
    const doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    get.returns(Promise.resolve(doc));
    put.returns(Promise.reject('save borked'));
    service.set('123', 2, 'muted', 'scheduled').catch(function(err) {
      chai.expect(err).to.equal('save borked');
      done();
    });
  });

  it('set saves if task changed', function(done) {
    const doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'sent' },
        { group: 2, state: 'muted', state_history: [{ state: 'muted', timestamp: '2014-09-11T02:52:45.586Z' }] },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    get.returns(Promise.resolve(doc));
    put.returns(Promise.resolve());

    service.set('123', 2, 'muted', 'scheduled').then(function() {
      chai.expect(get.args[0][0]).to.equal('123');
      const actual = put.args[0][0];
      chai.expect(SetTaskState.callCount).to.equal(2);
      chai.expect(actual.scheduled_tasks.length).to.equal(5);
      chai.expect(SetTaskState.getCall(0).args[0]).to.deep.equal({
        group: 2,
        state: 'muted',
        state_history: [{ state: 'muted', timestamp: '2014-09-11T02:52:45.586Z' }]
      });
      chai.expect(SetTaskState.getCall(0).args[1]).to.equal('scheduled');
      chai.expect(SetTaskState.getCall(1).args[0]).to.deep.equal({ group: 2, state: 'muted' });
      chai.expect(SetTaskState.getCall(1).args[1]).to.equal('scheduled');
    }).then(done, done).catch((err) => {
      window.__karma__.error(err);
    });
  });
});
