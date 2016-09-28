describe('Tasks service', function() {
  'use strict';

  var childPersonId,
    childPersonId2,
    docId,
    rulesEngineListen,
    service,
    stubRulesEngine,
    $rootScope;

  beforeEach(function() {
    module('inboxApp');

    docId = 'dockyMcDocface';
    childPersonId = 'hillary';
    childPersonId2 = 'donald';

    var log = { error: console.error, debug: console.info };
    module(function($provide) {
      $provide.value('$log', log);
    });

    rulesEngineListen = sinon.stub();
    stubRulesEngine = function(err, tasks) {
      rulesEngineListen.callsArgWith(2, err, tasks);
    };
    module(function($provide) {
      $provide.value('RulesEngine', { listen: rulesEngineListen });
    });

    inject(function(_$rootScope_, _TasksForContact_) {
      $rootScope = _$rootScope_;
      service = _TasksForContact_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(rulesEngineListen);
  });

  it('displays tasks for selected contact person', function(done) {
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);

    service(docId, 'person', [], 'listenerName',
      function(tasks) {
        chai.assert.equal(rulesEngineListen.callCount, 1);
        chai.assert.sameMembers(tasks, [ task ]);
        done();
      });
  });

  it('displays tasks for selected contact clinic', function(done) {
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);

    service(docId, 'clinic', [], 'listenerName',
      function(tasks) {
        chai.assert.equal(rulesEngineListen.callCount, 1);
        chai.assert.sameMembers(tasks, [ task ]);
        done();
      });
  });

  it('does not display tasks for other doctypes', function(done) {
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);

    service(docId, 'health_center', [], 'listenerName',
      function(tasks) {
        chai.assert.sameMembers(tasks, []);
        done();
      });
  });

  it('displays tasks for selected clinic and child persons', function(done) {
    var tasks = [
      {
        _id: 'taskForParent',
        date: 'Wed Oct 19 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: docId }
      },
      {
        _id: 'taskForChild',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: childPersonId }
      }
    ];
    stubRulesEngine(null, tasks);
    service(docId, 'clinic', [childPersonId], 'listenerName',
      function(newTasks) {
        chai.assert.equal(rulesEngineListen.callCount, 1);
        chai.assert.sameMembers(newTasks, tasks);
        done();
      });
  });

  it('does not displays tasks for child persons if selected doc is a person', function(done) {
    var tasks = [
      {
        _id: 'taskForParent',
        date: 'Wed Oct 19 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: docId }
      },
      {
        _id: 'taskForChild',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: childPersonId }
      }
    ];
    stubRulesEngine(null, tasks);
    service(docId, 'person', [childPersonId], 'listenerName',
      function(newTasks) {
        chai.assert.equal(rulesEngineListen.callCount, 1);
        chai.assert.sameMembers(newTasks, [tasks[0]]);
        done();
      });
  });

  it('does only displays tasks selected place and child persons', function(done) {
    var tasks = [
      {
        _id: 'taskForParent',
        date: 'Wed Oct 19 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: 'yadayada' }
      }
    ];
    stubRulesEngine(null, tasks);
    service(docId, 'clinic', [childPersonId], 'listenerName',
      function(newTasks) {
        chai.assert.sameMembers(newTasks, []);
        done();
      });
  });

  it('displays tasks in order of date', function(done) {
    var tasks = [
      {
        _id: 'taskForLater',
        date: 'Wed Oct 19 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: docId }
      },
      {
        _id: 'urgentTask',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: docId }
      }
    ];
    stubRulesEngine(null, tasks);
    service(docId, 'clinic', [], 'listenerName',
      function(newTasks) {
        chai.assert.deepEqual(newTasks, [tasks[1], tasks[0]]);
        done();
      });
  });

  it('displays only unresolved tasks', function(done) {
    var tasks = [
      {
        _id: 'resolvedTask',
        date: 'Wed Oct 19 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: docId },
        resolved: true
      },
      {
        _id: 'unresolvedTask',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: docId },
        resolved: false
      }
    ];
    stubRulesEngine(null, tasks);
    service(docId, 'clinic', [], 'listenerName',
      function(newTasks) {
        chai.assert.deepEqual(newTasks, [tasks[1]]);
        done();
      });
  });
});