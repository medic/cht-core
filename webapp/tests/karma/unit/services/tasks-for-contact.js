describe('TasksForContact service', function() {
  'use strict';

  var childPersonId,
    docId,
    rulesEngine,
    rulesEngineListen,
    service,
    stubRulesEngine,
    translate,
    translateFrom;

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
    translateFrom = sinon.stub();
    module(function($provide) {
      $provide.value('RulesEngine', { listen: rulesEngineListen, enabled: true });
      $provide.value('TranslateFrom', translateFrom);
    });

    inject(function(_TasksForContact_, _RulesEngine_, _$translate_) {
      service = _TasksForContact_;
      rulesEngine = _RulesEngine_;
      translate = _$translate_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(rulesEngineListen);
  });

  it('does not return tasks if RulesEngine is disabled.', function(done) {
    rulesEngine.enabled = false;
    var task = { _id: 'aa', contact: { _id: docId } };
    const model = {
      doc: { _id: docId, type: 'person' },
      children: { persons: [] }
    };
    stubRulesEngine(null, [task]);

    service(model, 'listenerName', (tasks) => {
      chai.assert.equal(rulesEngineListen.callCount, 0);
      chai.assert(!tasks);
      done();
    });
  });

  it('displays tasks for selected contact person', function(done) {
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);
    const model = {
      doc: { _id: docId, type: 'person' },
      children: { persons: [] }
    };

    service(model, 'listenerName', (tasks) => {
      chai.assert.equal(rulesEngineListen.callCount, 1);
      chai.assert.sameMembers(tasks, [ task ]);
      done();
    });
  });

  it('displays tasks for selected contact clinic', function(done) {
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);
    const model = {
      doc: { _id: docId, type: 'clinic' },
      children: { persons: [] }
    };

    service(model, 'listenerName', (tasks) => {
      chai.assert.equal(rulesEngineListen.callCount, 1);
      chai.assert.sameMembers(tasks, [ task ]);
      done();
    });
  });

  it('does not display tasks for other doctypes', function(done) {
    var task = { _id: 'aa', contact: { _id: docId } };
    stubRulesEngine(null, [task]);
    const model = {
      doc: { _id: docId, type: 'health_center' },
      children: { persons: [] }
    };

    service(model, 'listenerName', (tasks) => {
      chai.assert(!tasks);
      done();
    });
  });

  it('displays tasks for selected clinic and child persons', function(done) {
    const tasks = [
      {
        _id: 'taskForParent',
        date: 'Wed Oct 19 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: docId }
      },
      {
        _id: 'taskForChild1',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: 'child1' }
      },
      {
        _id: 'taskForChild2',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: 'child2' }
      },
      {
        _id: 'taskForChild1-bis',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: 'child1' }
      },
      {
        _id: 'taskForRandom',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: 'person' }
      },
      {
        _id: 'taskWithoutContact',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
      }
    ];

    const model = {
      doc: { _id: docId, type: 'clinic' },
      children: { persons: [{ id: 'child1' }, { id: 'child2' }] }
    };
    stubRulesEngine(null, tasks);
    service(model, 'listenerName', (newTasks) => {
      chai.assert.equal(rulesEngineListen.callCount, 1);
      chai.assert.equal(newTasks.length, 4);
      chai.assert.sameMembers(newTasks, tasks.slice(0, 4));
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
    const model = {
      doc: { _id: docId, type: 'person' },
      children: { persons: [{ id: childPersonId }] }
    };
    stubRulesEngine(null, tasks);
    service(model, 'listenerName', (newTasks) => {
      chai.assert.equal(rulesEngineListen.callCount, 1);
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
    const model = {
      doc: { _id: docId, type: 'clinic' },
      children: { persons: [{ id: childPersonId }] }
    };
    stubRulesEngine(null, tasks);
    service(model, 'listenerName', (newTasks) => {
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
    const model = {
      doc: { _id: docId, type: 'clinic' },
      children: { persons: [] }
    };
    service(model, 'listenerName', (newTasks) => {
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
    const model = {
      doc: { _id: docId, type: 'clinic' },
      children: { persons: [] }
    };
    stubRulesEngine(null, tasks);
    service(model, 'listenerName', (newTasks) => {
      chai.assert.deepEqual(newTasks, [tasks[1]]);
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
    const model = {
      doc: { _id: docId, type: 'clinic' },
      children: { persons: [] }
    };
    service(model, 'listenerName', (newTasks) => {
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

  it('should translate tasks labels', (done) => {
    sinon.stub(translate, 'instant');
    const tasks = [
      {
        _id: 'taskForParent',
        date: 'Wed Oct 19 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: docId },
        title: 'title1',
        priorityLabel: { some: 'thing' }
      },
      {
        _id: 'taskForChild',
        date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
        contact: { _id: childPersonId },
        title: { some: 'title' },
        priorityLabel: 'high?'
      }
    ];

    const model = {
      doc: { _id: docId, type: 'clinic' },
      children: { persons: [{ id: childPersonId, doc: { _id: childPersonId } }] }
    };
    stubRulesEngine(null, tasks);
    service(model, 'listenerName', (newTasks) => {
      chai.assert.equal(rulesEngineListen.callCount, 1);
      chai.assert.sameMembers(newTasks, tasks);
      chai.assert.equal(translate.instant.callCount, 2);
      chai.assert.deepEqual(translate.instant.args, [
        ['title1', tasks[0]],
        ['high?', tasks[1]]
      ]);
      chai.assert.equal(translateFrom.callCount, 2);
      chai.assert.deepEqual(translateFrom.args, [
        [{ some: 'thing' }, tasks[0]],
        [{ some: 'title' }, tasks[1]]
      ]);
      done();
    });
  });

});
