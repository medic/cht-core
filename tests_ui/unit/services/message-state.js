describe('MessageState service', function() {

  'use strict';

  var service,
      db,
      audit,
      doc;

  beforeEach(function() {
    db = {
      getDoc: function(recordId, callback) {
        callback(null, doc);
      }
    };
    audit = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('db', db);
      $provide.value('audit', audit);
    });
    inject(function(_MessageState_) {
      service = _MessageState_;
    });
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

  it('set returns get errors', function() {
    db.getDoc = function(recordId, callback) {
      callback('db messed up');
    };
    service.set('123', 2, 'scheduled', 'muted', function(err) {
      chai.expect(err).to.equal('db messed up');
    });
  });

  it('set does not save if nothing changed', function() {
    doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    service.set('123', 2, 'scheduled', 'muted', function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(doc);
    });
  });

  it('set returns save errors', function() {
    doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    audit.saveDoc = function(record, callback) {
      callback('audit borked');
    };
    service.set('123', 2, 'muted', 'scheduled', function(err) {
      chai.expect(err).to.equal('audit borked');
    });
  });

  it('set saves if task changed', function() {
    doc = {
      scheduled_tasks: [
        { group: 1, state: 'scheduled' },
        { group: 2, state: 'sent' },
        { group: 2, state: 'muted', state_history: [{ state: 'muted', timestamp: '2014-09-11T02:52:45.586Z' }] },
        { group: 2, state: 'muted' },
        { group: 3, state: 'sent' }
      ]
    };
    audit.saveDoc = function(record, callback) {
      callback();
    };
    service.set('123', 2, 'muted', 'scheduled', function(err, actual) {
      chai.expect(err).to.equal(undefined);
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
    });
  });

});