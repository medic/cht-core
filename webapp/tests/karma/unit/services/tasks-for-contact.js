describe('TasksForContact service', function() {
  'use strict';

  var childPersonId,
    docId,
    rulesEngine,
    rulesEngineListen,
    service,
    stubRulesEngine;

  beforeEach(function() {
    module('inboxApp');

    docId = 'dockyMcDocface';
    childPersonId = 'hillary';

    var log = { error: console.error, debug: console.info };
    module(function($provide) {
      $provide.value('$log', log);
    });

    rulesEngineListen = sinon.stub();
    stubRulesEngine = function(err, tasks) {
      rulesEngineListen.callsArgWith(2, err, tasks);
    };
    module(function($provide) {
      $provide.value('RulesEngine', { listen: rulesEngineListen, enabled: true });
    });

    inject(function(_TasksForContact_, _RulesEngine_) {
      service = _TasksForContact_;
      rulesEngine = _RulesEngine_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(rulesEngineListen);
  });

  it('does not return tasks if RulesEngine is disabled.', function(done) {
    rulesEngine.enabled = false;
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);

    service(docId, 'person', [], 'listenerName',
      function(areTasksEnabled, tasks) {
        chai.assert.equal(rulesEngineListen.callCount, 0);
        chai.assert(!areTasksEnabled);
        chai.assert.sameMembers(tasks, []);
        done();
      });
  });

  it('displays tasks for selected contact person', function(done) {
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);

    service(docId, 'person', [], 'listenerName',
      function(areTasksEnabled, tasks) {
        chai.assert.equal(rulesEngineListen.callCount, 1);
        chai.assert(areTasksEnabled);
        chai.assert.sameMembers(tasks, [ task ]);
        done();
      });
  });

  it('displays tasks for selected contact clinic', function(done) {
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);

    service(docId, 'clinic', [], 'listenerName',
      function(areTasksEnabled, tasks) {
        chai.assert.equal(rulesEngineListen.callCount, 1);
        chai.assert(areTasksEnabled);
        chai.assert.sameMembers(tasks, [ task ]);
        done();
      });
  });

  it('does not display tasks for other doctypes', function(done) {
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);

    service(docId, 'health_center', [], 'listenerName',
      function(areTasksEnabled, tasks) {
        chai.assert(!areTasksEnabled);
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
      function(areTasksEnabled, newTasks) {
        chai.assert.equal(rulesEngineListen.callCount, 1);
        chai.assert(areTasksEnabled);
        chai.assert.sameMembers(newTasks, tasks);
        done();
      });
  });

  it('does not display tasks for child persons if selected doc is a person', function(done) {
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
      function(areTasksEnabled, newTasks) {
        chai.assert.equal(rulesEngineListen.callCount, 1);
        chai.assert(areTasksEnabled);
        chai.assert.sameMembers(newTasks, [tasks[0]]);
        done();
      });
  });

  it('only displays tasks selected place and child persons', function(done) {
    var tasks = [
      {
        _id: 'taskForParent',
        date: 'Wed Oct 19 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: 'yadayada' }
      }
    ];
    stubRulesEngine(null, tasks);
    service(docId, 'clinic', [childPersonId], 'listenerName',
      function(areTasksEnabled, newTasks) {
        chai.assert.sameMembers(newTasks, []);
        chai.assert(areTasksEnabled);
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
      function(areTasksEnabled, newTasks) {
        chai.assert.deepEqual(newTasks, [tasks[1], tasks[0]]);
        chai.assert(areTasksEnabled);
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
      function(areTasksEnabled, newTasks) {
        chai.assert.deepEqual(newTasks, [tasks[1]]);
        chai.assert(areTasksEnabled);
        done();
      });
  });

  it('listens for changes from the rules engine', function(done) {
    var tasks = [
      {
        _id: 1,
        date: 'Wed Sep 14 2016 13:40:16 GMT+0200 (CEST)',
        contact: { _id: docId }
      },
      {
        _id: 2,
        date: 'Wed Sep 21 2016 13:40:16 GMT+0200 (CEST)',
        contact: { _id: docId }
      },
      {
        _id: 3,
        date: 'Wed Sep 28 2016 13:40:16 GMT+0200 (CEST)',
        contact: { _id: docId }
      }
    ];
    stubRulesEngine(null, tasks);
    var callCount = 0;
    service(docId, 'clinic', [], 'listenerName', function(areTasksEnabled, newTasks) {
      if (callCount === 0) {
        chai.assert.deepEqual(newTasks, tasks);
      } else if (callCount === 1) {
        chai.assert.deepEqual(newTasks, [ tasks[0], tasks[2] ]);
      } else if (callCount === 2) {
        chai.assert.deepEqual(newTasks, [ tasks[0] ]);
        done();
      } else {
        done('callback called too many times!');
      }
      callCount++;
    });
    var changesCallback = rulesEngineListen.args[0][2];

    // mark #2 resolved
    changesCallback(null, [{
      _id: 2,
      resolved: true,
      date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
      contact: { _id: docId }
    }]);

    // mark #3 deleted
    changesCallback(null, [{
      _id: 3,
      deleted: true,
      date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
      contact: { _id: docId }
    }]);
  });

});
