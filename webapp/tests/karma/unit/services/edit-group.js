describe('EditGroup service', function() {

  'use strict';

  let service;
  let get;
  let put;

  beforeEach(function() {
    put = sinon.stub();
    get = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ put: put, get: get }));
    });
    inject(function(_EditGroup_) {
      service = _EditGroup_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(put, get);
  });

  it('returns get errors', function(done) {
    get.returns(Promise.reject('db messed up'));
    const group = {};
    service('123', group)
      .catch(function(err) {
        chai.expect(err).to.equal('db messed up');
        done();
      });
  });

  it('does not save if nothing changed', function(done) {
    const doc = {
      scheduled_tasks: [
        { group: 1 },
        { group: 2 },
        { group: 3 }
      ]
    };
    const group = {
      rows: [ { group: 1, state: 'muted' } ]
    };
    get.returns(Promise.resolve(doc));
    service('123', group).then(function(actual) {
      chai.expect(actual).to.deep.equal(doc);
      done();
    }).catch(err => done(err));
  });

  it('returns save errors', function(done) {
    const doc = {
      scheduled_tasks: [
        { group: 1 },
        { group: 2 },
        { group: 3 }
      ]
    };
    get.returns(Promise.resolve(doc));
    put.returns(Promise.reject('audit borked'));
    const group = {
      number: 1,
      rows: [ { group: 1, state: 'scheduled' } ]
    };
    service('123', group).catch(function(err) {
      chai.expect(err).to.equal('audit borked');
      done();
    });
  });

  it('saves updated doc', function(done) {
    const doc = {
      scheduled_tasks: [
        { group: 1, due: '1', messages: [ { message: 'a' } ] },
        { group: 2, due: '2', messages: [ { message: 'b' } ] },
        { group: 2, due: '3', messages: [ { message: 'c' } ] },
        { group: 3, due: '4', messages: [ { message: 'd' } ] }
      ]
    };
    const group = {
      number: 2,
      rows: [
        { group: 2, state: 'scheduled', due: '5', messages: [ { message: 'e' } ] },
        { group: 2, state: 'muted', due: '6', messages: [ { message: 'f' } ] }
      ]
    };
    get.returns(Promise.resolve(doc));
    put.returns(Promise.resolve());
    service('123', group).then(function(actual) {
      chai.expect(actual.scheduled_tasks.length).to.equal(4);

      chai.expect(actual.scheduled_tasks[0].group).to.equal(1);
      chai.expect(actual.scheduled_tasks[0].due).to.equal('1');
      chai.expect(actual.scheduled_tasks[0].messages.length).to.equal(1);
      chai.expect(actual.scheduled_tasks[0].messages[0].message).to.equal('a');

      chai.expect(actual.scheduled_tasks[1].group).to.equal(2);
      chai.expect(actual.scheduled_tasks[1].due).to.equal('5');
      chai.expect(actual.scheduled_tasks[1].messages.length).to.equal(1);
      chai.expect(actual.scheduled_tasks[1].messages[0].message).to.equal('e');

      chai.expect(actual.scheduled_tasks[2].group).to.equal(2);
      chai.expect(actual.scheduled_tasks[2].due).to.equal('3');
      chai.expect(actual.scheduled_tasks[2].messages.length).to.equal(1);
      chai.expect(actual.scheduled_tasks[2].messages[0].message).to.equal('c');

      chai.expect(actual.scheduled_tasks[3].group).to.equal(3);
      chai.expect(actual.scheduled_tasks[3].due).to.equal('4');
      chai.expect(actual.scheduled_tasks[3].messages.length).to.equal(1);
      chai.expect(actual.scheduled_tasks[3].messages[0].message).to.equal('d');

      done();
    }).catch(done);
  });

  it('removes deleted messages', function(done) {
    const doc = {
      scheduled_tasks: [
        { group: 2, due: '2', messages: [ { message: 'b' } ] },
        { group: 2, due: '3', messages: [ { message: 'c' } ] },
        { group: 2, due: '4', messages: [ { message: 'd' } ] }
      ]
    };
    const group = {
      number: 2,
      rows: [
        { group: 2, state: 'scheduled', due: '5', messages: [ { message: 'e' } ], deleted: true },
        { group: 2, state: 'scheduled', due: '6', messages: [ { message: 'f' } ] },
        { group: 2, state: 'scheduled', due: '7', messages: [ { message: 'g' } ], deleted: true }
      ]
    };
    get.returns(Promise.resolve(doc));
    put.returns(Promise.resolve());
    service('123', group).then(function(actual) {
      chai.expect(actual.scheduled_tasks.length).to.equal(1);
      chai.expect(actual.scheduled_tasks[0].group).to.equal(2);
      chai.expect(actual.scheduled_tasks[0].due).to.equal('6');
      chai.expect(actual.scheduled_tasks[0].messages.length).to.equal(1);
      chai.expect(actual.scheduled_tasks[0].messages[0].message).to.equal('f');

      done();
    }).catch(done);
  });

  it('adds new messages', function(done) {
    const doc = {
      scheduled_tasks: [
        { group: 2, due: '2', messages: [ { to: '5551234', message: 'b' } ] }
      ]
    };
    const group = {
      number: 2,
      rows: [
        { group: 2, state: 'scheduled', due: '6', messages: [ { to: '5551234', message: 'f' } ] },
        { group: 2, state: 'scheduled', due: '5', messages: [ { message: 'e' } ], added: true, deleted: true },
        { group: 2, state: 'scheduled', due: '7', messages: [ { message: 'g' } ], added: true }
      ]
    };
    get.returns(Promise.resolve(doc));
    put.returns(Promise.resolve());
    service('123', group).then(function(actual) {
      chai.expect(actual.scheduled_tasks.length).to.equal(2);

      let task = actual.scheduled_tasks[0];
      chai.expect(task.group).to.equal(2);
      chai.expect(task.due).to.equal('6');
      chai.expect(task.messages.length).to.equal(1);
      chai.expect(task.messages[0].message).to.equal('f');
      chai.expect(task.messages[0].to).to.equal('5551234');

      task = actual.scheduled_tasks[1];
      chai.expect(task.group).to.equal(2);
      chai.expect(task.due).to.equal('7');
      chai.expect(task.messages.length).to.equal(1);
      chai.expect(task.messages[0].message).to.equal('g');
      chai.expect(task.messages[0].to).to.equal('5551234');

      done();
    }).catch(done);
  });

  it('gets the to number from the data_record', function(done) {
    const doc = {
      from: '5554321',
      scheduled_tasks: []
    };
    const group = {
      number: 2,
      rows: [
        { group: 2, state: 'scheduled', due: '7', messages: [ { message: 'g' } ], added: true }
      ]
    };
    get.returns(Promise.resolve(doc));
    put.returns(Promise.resolve());
    service('123', group).then(function(actual) {
      chai.expect(actual.scheduled_tasks.length).to.equal(1);

      const task = actual.scheduled_tasks[0];
      chai.expect(task.group).to.equal(2);
      chai.expect(task.due).to.equal('7');
      chai.expect(task.messages.length).to.equal(1);
      chai.expect(task.messages[0].message).to.equal('g');
      chai.expect(task.messages[0].to).to.equal('5554321');

      done();
    }).catch(done);
  });

});
