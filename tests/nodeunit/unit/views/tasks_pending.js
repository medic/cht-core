var views = require('../../../../lib/views');

var emitted = [];
emit = function(e) {
  emitted.push(e);
};

exports.setUp = function(cb) {
  emitted = [];
  cb();
};

exports['No emit on empty doc'] = function(test) {
  views.tasks_pending.map({});

  test.deepEqual(emitted, []);

  test.done();
};

exports['No emit for empty tasks'] = function(test) {
  views.tasks_pending.map({
    tasks: [],
    scheduled_tasks: []
  });

  test.deepEqual(emitted, []);

  test.done();
};

exports['No emit when tasks missing messages'] = function(test) {
  views.tasks_pending.map({
    tasks: [{
      state: 'pending',
      messages: []
    }],
    scheduled_tasks: [{
      state: 'pending',
      messages: []
    }]
  });

  test.deepEqual(emitted, []);

  views.tasks_pending.map({
    tasks: [{
      state: 'pending',
      messages: null
    }]
  });

  test.deepEqual(emitted, []);

  test.done();
};

exports['Emits only for pending tasks'] = function(test) {
  views.tasks_pending.map({
    tasks: [{
      state: 'notpending',
      messages: [
        {
          to: 'someone',
          message: 'hello!'
        }
      ]
    }],
    scheduled_tasks: [{
      state: 'notpending',
      messages: [
        {
          to: 'someone',
          message: 'hello!'
        }
      ]
    }]
  });

  test.deepEqual(emitted, []);

  test.done();
};

exports['Emits when message is valid on pending task'] = function(test) {
  views.tasks_pending.map({
    tasks: [{
      state: 'pending',
      messages: [
        {
          to: 'someone',
          message: 'hello!'
        }
      ]
    }],
    reported_date: 'test',
    refid: 'passed'
  });

  test.deepEqual(emitted, [['test', 'passed']]);

  test.done();
};

exports['Emits only when message is valid on pending scheduled task with no errors'] = function(test) {
  views.tasks_pending.map({
    scheduled_tasks: [{
      state: 'pending',
      messages: [
        {
          to: 'someone',
          message: 'hello!'
        }
      ]
    }],
    errors: ['an error occurred'],
    reported_date: 'test',
    refid: 'passed'
  });

  test.deepEqual(emitted, []);

  views.tasks_pending.map({
    scheduled_tasks: [{
      state: 'pending',
      messages: [
        {
          to: 'someone',
          message: 'hello!'
        }
      ]
    }],
    reported_date: 'test',
    refid: 'passed'
  });

  test.deepEqual(emitted, [['test', 'passed']]);

  test.done();
};


exports['any of the tasks can be valid for the emit to occur'] = function(test) {
  views.tasks_pending.map({
    tasks: [{},{},{},
    {
      state: 'pending',
      messages: [
        {
          to: 'someone',
          message: 'hello!'
        }
      ]
    },{},{},{}],
    reported_date: 'test',
    refid: 'passed'
  });

  test.deepEqual(emitted, [['test', 'passed']]);

  test.done();
};

exports['any of the scheduled_tasks can be valid for the emit to occur'] = function(test) {
  views.tasks_pending.map({
    scheduled_tasks: [{},{},{},
    {
      state: 'pending',
      messages: [
        {
          to: 'someone',
          message: 'hello!'
        }
      ]
    },{},{},{}],
    reported_date: 'test',
    refid: 'passed'
  });

  test.deepEqual(emitted, [['test', 'passed']]);

  test.done();
};

exports['any of the tasks messages can be valid for the emit to occur'] = function(test) {
  views.tasks_pending.map({
    tasks: [{},{},{},
    {
      state: 'pending',
      messages: [{},{},{},
        {
          to: 'someone',
          message: 'hello!'
        },{},{},{}
      ]
    },{},{},{}],
    reported_date: 'test',
    refid: 'passed'
  });

  test.deepEqual(emitted, [['test', 'passed']]);

  test.done();
};

exports['any of the scheduled_tasks messages can be valid for the emit to occur'] = function(test) {
  views.tasks_pending.map({
    scheduled_tasks: [{},{},{},
    {
      state: 'pending',
      messages: [{},{},{},
        {
          to: 'someone',
          message: 'hello!'
        },{},{},{}
      ]
    },{},{},{}],
    reported_date: 'test',
    refid: 'passed'
  });

  test.deepEqual(emitted, [['test', 'passed']]);

  test.done();
};
